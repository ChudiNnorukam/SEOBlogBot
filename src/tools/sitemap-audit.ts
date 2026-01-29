// Sitemap Audit Tool

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { XMLParser } from 'fast-xml-parser';
import { fetchUrl, joinUrl } from '../services/http-client.js';
import type { SitemapAuditResult, Issue } from '../types/index.js';

const VALID_CONTENT_TYPES = [
  'application/xml',
  'text/xml',
  'application/rss+xml',
];

const MAX_SITEMAP_URLS = 50000;
const MAX_SITEMAP_INDEX_ENTRIES = 50000;
const MAX_SITEMAP_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_NESTED_INDEX_CHECKS = 10;
const VALID_CHANGEFREQ = new Set([
  'always',
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'never',
]);
const ROBOTS_TEST_USER_AGENT = 'googlebot';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true,
});

const stripWww = (host: string): string => host.replace(/^www\./i, '');

const getText = (value: unknown): string | null => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object' && '#text' in value) {
    const text = (value as { ['#text']?: unknown })['#text'];
    if (typeof text === 'string') return text.trim();
  }
  return null;
};

const parseAbsoluteUrl = (value: string): URL | null => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const getSitemapBasePath = (sitemapUrl: URL): string => {
  const path = sitemapUrl.pathname;
  if (path.endsWith('/')) return path;
  const idx = path.lastIndexOf('/');
  return idx >= 0 ? path.slice(0, idx + 1) : '/';
};

const addSample = (bucket: string[], value: string, limit = 5): void => {
  if (bucket.length < limit) bucket.push(value);
};

type RobotsRule = {
  type: 'allow' | 'disallow';
  path: string;
};

type RobotsGroup = {
  agents: string[];
  rules: RobotsRule[];
};

const ROBOTS_DIRECTIVE = {
  userAgent: 'user-agent',
  allow: 'allow',
  disallow: 'disallow',
  sitemap: 'sitemap',
} as const;

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const pathMatches = (pattern: string, path: string): boolean => {
  if (!pattern) return false;
  let rawPattern = pattern.trim();
  let anchored = false;
  if (rawPattern.endsWith('$')) {
    anchored = true;
    rawPattern = rawPattern.slice(0, -1);
  }
  const regexBody = escapeRegex(rawPattern).replace(/\\\*/g, '.*');
  const regex = anchored ? new RegExp(`^${regexBody}$`) : new RegExp(`^${regexBody}`);
  return regex.test(path);
};

const parseRobots = (text: string): RobotsGroup[] => {
  const groups: RobotsGroup[] = [];
  let currentGroup: RobotsGroup | null = null;
  let groupHasRules = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split('#')[0]?.trim() ?? '';
    if (!line) continue;

    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (key === ROBOTS_DIRECTIVE.userAgent) {
      if (!currentGroup || groupHasRules) {
        currentGroup = { agents: [], rules: [] };
        groups.push(currentGroup);
        groupHasRules = false;
      }
      if (value) currentGroup.agents.push(value.toLowerCase());
      continue;
    }

    if (key === ROBOTS_DIRECTIVE.allow || key === ROBOTS_DIRECTIVE.disallow) {
      if (!currentGroup) continue;
      currentGroup.rules.push({
        type: key === ROBOTS_DIRECTIVE.allow ? 'allow' : 'disallow',
        path: value,
      });
      groupHasRules = true;
      continue;
    }

    if (key === ROBOTS_DIRECTIVE.sitemap) {
      continue;
    }
  }

  return groups;
};

const pickRobotsGroup = (userAgent: string, groups: RobotsGroup[]): RobotsGroup | null => {
  const ua = userAgent.toLowerCase();
  let bestGroup: RobotsGroup | null = null;
  let bestMatchLength = -1;

  for (const group of groups) {
    for (const agent of group.agents) {
      if (!agent) continue;
      if (agent === '*') {
        if (bestMatchLength < 1) {
          bestGroup = group;
          bestMatchLength = 1;
        }
        continue;
      }
      if (ua.includes(agent) && agent.length > bestMatchLength) {
        bestGroup = group;
        bestMatchLength = agent.length;
      }
    }
  }

  return bestGroup;
};

const isAllowedByRules = (path: string, rules: RobotsRule[]): boolean => {
  let bestRule: RobotsRule | null = null;
  let bestLength = -1;

  for (const rule of rules) {
    if (rule.type === 'disallow' && rule.path === '') continue;
    if (!pathMatches(rule.path, path)) continue;

    const ruleLength = rule.path.length;
    if (ruleLength > bestLength) {
      bestRule = rule;
      bestLength = ruleLength;
    } else if (ruleLength === bestLength && bestRule && bestRule.type === 'disallow' && rule.type === 'allow') {
      bestRule = rule;
    }
  }

  if (!bestRule) return true;
  return bestRule.type === 'allow';
};

const checkUrlsAgainstRobots = async (
  baseUrl: string,
  urls: string[],
  userAgent: string
): Promise<{ blocked: string[]; status: 'ok' | 'skipped'; message?: string }> => {
  const robotsUrl = joinUrl(baseUrl, '/robots.txt');
  try {
    const response = await fetchUrl(robotsUrl);
    if (response.status < 200 || response.status >= 300) {
      return {
        blocked: [],
        status: 'skipped',
        message: `robots.txt returned ${response.status}`,
      };
    }

    const groups = parseRobots(response.body ?? '');
    if (groups.length === 0) return { blocked: [], status: 'ok' };

    const group = pickRobotsGroup(userAgent, groups) ?? pickRobotsGroup('*', groups);
    if (!group) return { blocked: [], status: 'ok' };

    const blocked = urls.filter((url) => {
      try {
        const parsed = new URL(url);
        const path = `${parsed.pathname}${parsed.search}`;
        return !isAllowedByRules(path, group.rules);
      } catch {
        return false;
      }
    });

    return { blocked, status: 'ok' };
  } catch (error) {
    return {
      blocked: [],
      status: 'skipped',
      message: error instanceof Error ? error.message : 'Robots.txt check failed',
    };
  }
};

export function registerAuditSitemapTool(server: McpServer): void {
  server.registerTool(
    'audit-sitemap',
    {
      title: 'Audit Sitemap',
      description:
        'Validate sitemap.xml accessibility, content-type, and structure for SEO compliance. Checks if Google can fetch the sitemap correctly.',
      inputSchema: {
        siteUrl: z.string().url().describe('Base URL of the site (e.g., https://example.com)'),
        sitemapPath: z
          .string()
          .default('/sitemap.xml')
          .describe('Path to sitemap (default: /sitemap.xml)'),
      },
      outputSchema: {
        accessible: z.boolean(),
        contentType: z.string(),
        statusCode: z.number(),
        urlCount: z.number(),
        issues: z.array(
          z.object({
            type: z.enum(['warning', 'error']),
            message: z.string(),
          })
        ),
        sampleUrls: z.array(z.string()),
      },
    },
    async ({ siteUrl, sitemapPath }) => {
      const result = await auditSitemap(siteUrl, sitemapPath);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    }
  );
}

async function auditSitemap(
  siteUrl: string,
  sitemapPath: string
): Promise<SitemapAuditResult> {
  const issues: Issue[] = [];
  const sitemapUrl = joinUrl(siteUrl, sitemapPath);
  const sitemapUrlObj = new URL(sitemapUrl);
  const sitemapHost = sitemapUrlObj.host;
  const sitemapBasePath = getSitemapBasePath(sitemapUrlObj);

  let response;
  try {
    response = await fetchUrl(sitemapUrl);
  } catch (error) {
    return {
      accessible: false,
      contentType: 'unknown',
      statusCode: 0,
      urlCount: 0,
      issues: [
        {
          type: 'error',
          message: `Failed to fetch sitemap: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      sampleUrls: [],
    };
  }

  const contentType = response.headers['content-type'] ?? 'unknown';
  const accessible = response.status >= 200 && response.status < 300;

  if (!accessible) {
    issues.push({
      type: 'error',
      message: `Sitemap returned HTTP ${response.status}. Google cannot fetch this sitemap.`,
    });
  }

  if (accessible) {
    const fileSizeBytes = Buffer.byteLength(response.body ?? '', 'utf8');
    if (fileSizeBytes > MAX_SITEMAP_SIZE_BYTES) {
      issues.push({
        type: 'error',
        message: `Sitemap exceeds 50MB uncompressed (${(fileSizeBytes / (1024 * 1024)).toFixed(2)}MB). Split into multiple sitemaps.`,
      });
    }
  }

  if (accessible && response.body) {
    const encodingMatch = response.body.match(/<\?xml[^>]*encoding=["']([^"']+)["']/i);
    const declaredEncoding = encodingMatch?.[1]?.toLowerCase();
    const charsetMatch = contentType.match(/charset=([^;]+)/i);
    const declaredCharset = charsetMatch?.[1]?.trim().toLowerCase();
    const effectiveEncoding = declaredEncoding ?? declaredCharset ?? 'utf-8';

    if (effectiveEncoding !== 'utf-8' && effectiveEncoding !== 'utf8') {
      issues.push({
        type: 'error',
        message: `Sitemap encoding is ${effectiveEncoding}. Expected UTF-8.`,
      });
    } else if (!encodingMatch && !charsetMatch) {
      issues.push({
        type: 'warning',
        message: 'Sitemap encoding not declared. Recommend UTF-8 declaration.',
      });
    }
  }

  // Check content-type
  const hasValidContentType = VALID_CONTENT_TYPES.some((type) =>
    contentType.toLowerCase().includes(type)
  );

  if (!hasValidContentType && accessible) {
    if (contentType.toLowerCase().includes('text/html')) {
      issues.push({
        type: 'error',
        message: `Sitemap returns HTML instead of XML. Content-Type: ${contentType}. This often indicates middleware blocking or an error page.`,
      });
    } else {
      issues.push({
        type: 'warning',
        message: `Unexpected Content-Type: ${contentType}. Expected application/xml or text/xml.`,
      });
    }
  }

  // Parse XML
  let urls: string[] = [];
  if (accessible && response.body) {
    try {
      const parsed = xmlParser.parse(response.body);
      const urlset = (parsed as { urlset?: { url?: unknown } }).urlset?.url;
      const sitemapIndex = (parsed as { sitemapindex?: { sitemap?: unknown } }).sitemapindex?.sitemap;

      if (!urlset && !sitemapIndex) {
        issues.push({
          type: 'error',
          message: 'Sitemap XML does not contain <urlset> or <sitemapindex>.',
        });
      }

      // Handle standard sitemap
      let missingLocCount = 0;
      let invalidUrlCount = 0;
      let invalidDateCount = 0;
      let invalidTagValueCount = 0;
      let hostMismatchCount = 0;
      let pathMismatchCount = 0;
      let wwwMismatchCount = 0;
      let incompleteIndexUrlCount = 0;
      const invalidUrlSamples: string[] = [];
      const hostMismatchSamples: string[] = [];
      const pathMismatchSamples: string[] = [];

      if (urlset) {
        const urlEntries = Array.isArray(urlset) ? urlset : [urlset];
        const totalEntries = urlEntries.length;

        if (totalEntries > MAX_SITEMAP_URLS) {
          issues.push({
            type: 'error',
            message: `Sitemap has ${totalEntries} URLs (limit ${MAX_SITEMAP_URLS}).`,
          });
        }

        let entriesWithoutLastmod = 0;

        for (const entry of urlEntries) {
          const entryObj = entry as Record<string, unknown>;
          const loc = getText(entryObj.loc);
          if (!loc) {
            missingLocCount += 1;
            continue;
          }

          const parsedUrl = parseAbsoluteUrl(loc);
          if (!parsedUrl) {
            invalidUrlCount += 1;
            addSample(invalidUrlSamples, loc);
            continue;
          }

          urls.push(parsedUrl.href);

          if (parsedUrl.host !== sitemapHost) {
            if (stripWww(parsedUrl.host) === stripWww(sitemapHost)) {
              wwwMismatchCount += 1;
            } else {
              hostMismatchCount += 1;
              addSample(hostMismatchSamples, loc);
            }
          }

          if (sitemapBasePath !== '/' && !parsedUrl.pathname.startsWith(sitemapBasePath)) {
            pathMismatchCount += 1;
            addSample(pathMismatchSamples, loc);
          }

          const lastmod = getText(entryObj.lastmod);
          if (!lastmod) {
            entriesWithoutLastmod += 1;
          } else if (Number.isNaN(Date.parse(lastmod))) {
            invalidDateCount += 1;
          }

          const changefreq = getText(entryObj.changefreq);
          if (changefreq && !VALID_CHANGEFREQ.has(changefreq)) {
            invalidTagValueCount += 1;
          }

          const priorityRaw = getText(entryObj.priority);
          if (priorityRaw) {
            const priorityValue = Number(priorityRaw);
            if (!Number.isFinite(priorityValue) || priorityValue < 0 || priorityValue > 1) {
              invalidTagValueCount += 1;
            }
          }
        }

        if (entriesWithoutLastmod > 0) {
          issues.push({
            type: 'warning',
            message: `${entriesWithoutLastmod} URLs missing lastmod date. This helps search engines understand content freshness.`,
          });
        }

        if (urls.length === 0) {
          issues.push({
            type: 'error',
            message: 'Sitemap contains no valid URLs. Check XML structure and <loc> tags.',
          });
        }

        if (urls.length > 0) {
          const robotsResult = await checkUrlsAgainstRobots(siteUrl, urls, ROBOTS_TEST_USER_AGENT);
          if (robotsResult.status === 'skipped') {
            issues.push({
              type: 'warning',
              message: `Robots.txt check skipped: ${robotsResult.message ?? 'Unknown reason'}`,
            });
          } else if (robotsResult.blocked.length > 0) {
            issues.push({
              type: 'error',
              message: `${robotsResult.blocked.length} sitemap URLs blocked by robots.txt (examples: ${robotsResult.blocked.slice(0, 5).join(', ')})`,
            });
          }
        }
      }

      if (sitemapIndex) {
        const sitemaps = Array.isArray(sitemapIndex) ? sitemapIndex : [sitemapIndex];
        const totalSitemaps = sitemaps.length;

        if (totalSitemaps > MAX_SITEMAP_INDEX_ENTRIES) {
          issues.push({
            type: 'error',
            message: `Sitemap index has ${totalSitemaps} entries (limit ${MAX_SITEMAP_INDEX_ENTRIES}).`,
          });
        }

        const sitemapLocs: string[] = [];

        for (const entry of sitemaps) {
          const entryObj = entry as Record<string, unknown>;
          const loc = getText(entryObj.loc);
          if (!loc) {
            missingLocCount += 1;
            continue;
          }

          if (!/^https?:\/\//i.test(loc)) {
            incompleteIndexUrlCount += 1;
          }

          const parsedUrl = parseAbsoluteUrl(loc);
          if (!parsedUrl) {
            invalidUrlCount += 1;
            addSample(invalidUrlSamples, loc);
            continue;
          }

          sitemapLocs.push(parsedUrl.href);
          urls.push(parsedUrl.href);

          if (parsedUrl.host !== sitemapHost) {
            if (stripWww(parsedUrl.host) === stripWww(sitemapHost)) {
              wwwMismatchCount += 1;
            } else {
              hostMismatchCount += 1;
              addSample(hostMismatchSamples, loc);
            }
          }

          if (sitemapBasePath !== '/' && !parsedUrl.pathname.startsWith(sitemapBasePath)) {
            pathMismatchCount += 1;
            addSample(pathMismatchSamples, loc);
          }

          const lastmod = getText(entryObj.lastmod);
          if (lastmod && Number.isNaN(Date.parse(lastmod))) {
            invalidDateCount += 1;
          }
        }

        const nestedIndexSamples: string[] = [];
        const toCheck = sitemapLocs.slice(0, MAX_NESTED_INDEX_CHECKS);
        for (const loc of toCheck) {
          try {
            const child = await fetchUrl(loc);
            if (child.status >= 200 && child.status < 300 && child.body) {
              const childParsed = xmlParser.parse(child.body);
              if ((childParsed as { sitemapindex?: unknown }).sitemapindex) {
                addSample(nestedIndexSamples, loc);
              }
            }
          } catch {
            // Ignore nested index checks on fetch failures
          }
        }

        if (nestedIndexSamples.length > 0) {
          issues.push({
            type: 'error',
            message: `Nested sitemap indexes detected (examples: ${nestedIndexSamples.join(', ')}).`,
          });
        } else if (sitemapLocs.length > MAX_NESTED_INDEX_CHECKS) {
          issues.push({
            type: 'warning',
            message: `Nested sitemap index check limited to first ${MAX_NESTED_INDEX_CHECKS} child sitemaps.`,
          });
        }

        issues.push({
          type: 'warning',
          message: `This is a sitemap index with ${sitemapLocs.length} child sitemaps. Run audits on individual sitemaps for URL-level issues.`,
        });
      }

      if (missingLocCount > 0) {
        issues.push({
          type: 'error',
          message: `${missingLocCount} entries are missing required <loc> tags.`,
        });
      }

      if (invalidUrlCount > 0) {
        issues.push({
          type: 'error',
          message: `${invalidUrlCount} URLs are invalid or not absolute (examples: ${invalidUrlSamples.join(', ')}).`,
        });
      }

      if (incompleteIndexUrlCount > 0) {
        issues.push({
          type: 'error',
          message: `${incompleteIndexUrlCount} sitemap index URLs are incomplete (must be absolute).`,
        });
      }

      if (invalidDateCount > 0) {
        issues.push({
          type: 'error',
          message: `${invalidDateCount} lastmod values are invalid (use ISO 8601 or YYYY-MM-DD).`,
        });
      }

      if (invalidTagValueCount > 0) {
        issues.push({
          type: 'error',
          message: `${invalidTagValueCount} changefreq/priority values are invalid.`,
        });
      }

      if (hostMismatchCount > 0 || pathMismatchCount > 0) {
        issues.push({
          type: 'error',
          message: `URL not allowed: ${hostMismatchCount + pathMismatchCount} URLs are outside the sitemap scope (host/path mismatch).`,
        });
      }

      if (wwwMismatchCount > 0) {
        issues.push({
          type: 'error',
          message: `Path mismatch (www): ${wwwMismatchCount} URLs differ only by www vs non-www.`,
        });
      }
    } catch (parseError) {
      issues.push({
        type: 'error',
        message: `Failed to parse sitemap XML: ${parseError instanceof Error ? parseError.message : 'Invalid XML'}`,
      });
    }
  }

  // Limit sample URLs to first 10
  const sampleUrls = urls.slice(0, 10);

  return {
    accessible,
    contentType,
    statusCode: response.status,
    urlCount: urls.length,
    issues,
    sampleUrls,
  };
}
