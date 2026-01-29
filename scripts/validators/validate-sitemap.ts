// scripts/validators/validate-sitemap.ts
// Sitemap validation module

import { XMLParser } from 'fast-xml-parser';
import type { CheckResult, SitemapAnalysis, SitemapEntry } from '../../lib/types';
import { parseRobotsTxt, pickRobotsGroup, isAllowedByRules } from '../utils/robots';

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

const ROBOTS_TEST_USER_AGENT = 'Googlebot';

const checkUrlsAgainstRobots = async (
  baseUrl: string,
  urls: string[],
  userAgent: string
): Promise<{ blocked: string[]; status: 'ok' | 'skipped'; message?: string }> => {
  const robotsUrl = new URL('/robots.txt', baseUrl).href;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(robotsUrl, {
      headers: { 'User-Agent': userAgent },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        blocked: [],
        status: 'skipped',
        message: `robots.txt returned ${response.status}`,
      };
    }

    const text = await response.text();
    const groups = parseRobotsTxt(text);
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

export interface SitemapValidatorOptions {
  baseUrl: string;
  userAgent?: string;
  timeout?: number;
}

/**
 * Validate sitemap accessibility and content
 */
export async function validateSitemap(options: SitemapValidatorOptions): Promise<{
  checks: CheckResult[];
  analysis: SitemapAnalysis;
}> {
  const { baseUrl, userAgent = 'SEOBlogBot/1.1', timeout = 10000 } = options;
  const sitemapUrl = new URL('/sitemap.xml', baseUrl).href;
  const sitemapUrlObj = new URL(sitemapUrl);
  const sitemapHost = sitemapUrlObj.host;
  const sitemapBasePath = getSitemapBasePath(sitemapUrlObj);
  const checks: CheckResult[] = [];

  const analysis: SitemapAnalysis = {
    accessible: false,
    statusCode: 0,
    contentType: '',
    isValidXml: false,
    urlCount: 0,
    entries: [],
    hasLastmod: false,
    issues: [],
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(sitemapUrl, {
      headers: { 'User-Agent': userAgent },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    analysis.statusCode = response.status;
    analysis.contentType = response.headers.get('content-type') || '';

    // Check 1: HTTP Status
    if (!response.ok) {
      const severity = response.status >= 500 ? 'CRITICAL' : 'CRITICAL';
      checks.push({
        name: 'Sitemap HTTP Status',
        status: 'FAILED',
        severity,
        message: `Sitemap returned ${response.status} ${response.statusText}`,
        fix: response.status >= 500
          ? 'Add `export const dynamic = "force-dynamic"` to app/sitemap.ts'
          : 'Create app/sitemap.ts using the template',
      });
      return { checks, analysis };
    }

    analysis.accessible = true;
    checks.push({
      name: 'Sitemap HTTP Status',
      status: 'PASSED',
      severity: 'CRITICAL',
      message: '200 OK',
    });

    // Check 2: Content-Type
    if (!analysis.contentType.includes('xml')) {
      checks.push({
        name: 'Sitemap Content-Type',
        status: 'FAILED',
        severity: 'HIGH',
        message: `Expected XML, got: ${analysis.contentType}`,
        fix: 'Ensure sitemap.ts returns MetadataRoute.Sitemap type',
      });
    } else {
      checks.push({
        name: 'Sitemap Content-Type',
        status: 'PASSED',
        severity: 'HIGH',
        message: analysis.contentType,
      });
    }

    // Parse content
    const text = await response.text();
    const fileSizeBytes = Buffer.byteLength(text, 'utf8');

    // Check 3: File size (50MB uncompressed limit)
    if (fileSizeBytes > MAX_SITEMAP_SIZE_BYTES) {
      checks.push({
        name: 'Sitemap File Size',
        status: 'FAILED',
        severity: 'CRITICAL',
        message: `Sitemap is ${(fileSizeBytes / (1024 * 1024)).toFixed(2)}MB (limit 50MB)`,
        fix: 'Split sitemap into multiple files and use a sitemap index',
        details: { fileSizeBytes },
      });
    } else {
      checks.push({
        name: 'Sitemap File Size',
        status: 'PASSED',
        severity: 'HIGH',
        message: `${(fileSizeBytes / (1024 * 1024)).toFixed(2)}MB`,
        details: { fileSizeBytes },
      });
    }

    // Check 4: XML encoding (UTF-8 recommended)
    const encodingMatch = text.match(/<\?xml[^>]*encoding=["']([^"']+)["']/i);
    const declaredEncoding = encodingMatch?.[1]?.toLowerCase();
    const charsetMatch = analysis.contentType.match(/charset=([^;]+)/i);
    const declaredCharset = charsetMatch?.[1]?.trim().toLowerCase();
    const effectiveEncoding = declaredEncoding ?? declaredCharset ?? 'utf-8';

    if (effectiveEncoding !== 'utf-8' && effectiveEncoding !== 'utf8') {
      checks.push({
        name: 'Sitemap Encoding',
        status: 'FAILED',
        severity: 'HIGH',
        message: `Sitemap declares ${effectiveEncoding} encoding (expected UTF-8)`,
        fix: 'Serve sitemap in UTF-8 encoding',
      });
    } else if (!encodingMatch && !charsetMatch) {
      checks.push({
        name: 'Sitemap Encoding',
        status: 'WARNING',
        severity: 'LOW',
        message: 'No UTF-8 encoding declaration found',
        fix: 'Declare UTF-8 encoding in XML header or Content-Type',
      });
    } else {
      checks.push({
        name: 'Sitemap Encoding',
        status: 'PASSED',
        severity: 'LOW',
        message: 'UTF-8',
      });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = xmlParser.parse(text);
    } catch (parseError) {
      checks.push({
        name: 'Sitemap XML Structure',
        status: 'FAILED',
        severity: 'CRITICAL',
        message: `Invalid XML: ${parseError instanceof Error ? parseError.message : 'Parse error'}`,
        fix: 'Ensure sitemap is valid XML (no HTML or template errors)',
      });
      return { checks, analysis };
    }

    const urlset = (parsed as { urlset?: { url?: unknown } }).urlset?.url;
    const sitemapIndex = (parsed as { sitemapindex?: { sitemap?: unknown } }).sitemapindex?.sitemap;
    const hasUrlset = Boolean(urlset);
    const hasSitemapIndex = Boolean(sitemapIndex);

    if (!hasUrlset && !hasSitemapIndex) {
      checks.push({
        name: 'Sitemap XML Structure',
        status: 'FAILED',
        severity: 'CRITICAL',
        message: 'XML does not contain <urlset> or <sitemapindex>',
        fix: 'Ensure sitemap conforms to the standard sitemap protocol',
      });
      return { checks, analysis };
    }

    analysis.isValidXml = true;
    checks.push({
      name: 'Sitemap XML Structure',
      status: 'PASSED',
      severity: 'CRITICAL',
      message: hasSitemapIndex ? 'Sitemap index detected' : 'URL set detected',
    });

    const urls: SitemapEntry[] = [];
    let missingLocCount = 0;
    let invalidUrlCount = 0;
    let invalidDateCount = 0;
    let invalidTagValueCount = 0;
    let hostMismatchCount = 0;
    let pathMismatchCount = 0;
    let wwwMismatchCount = 0;
    const invalidUrlSamples: string[] = [];
    const hostMismatchSamples: string[] = [];
    const pathMismatchSamples: string[] = [];

    if (hasUrlset) {
      const urlEntries = Array.isArray(urlset) ? urlset : [urlset];
      const totalEntries = urlEntries.length;

      if (totalEntries > MAX_SITEMAP_URLS) {
        checks.push({
          name: 'Too Many URLs',
          status: 'FAILED',
          severity: 'CRITICAL',
          message: `Sitemap has ${totalEntries} URLs (limit ${MAX_SITEMAP_URLS})`,
          fix: 'Split sitemap into multiple files and use a sitemap index',
          details: { totalEntries },
        });
      } else {
        checks.push({
          name: 'Too Many URLs',
          status: 'PASSED',
          severity: 'HIGH',
          message: `${totalEntries} URLs`,
          details: { totalEntries },
        });
      }

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

        const changefreq = getText(entryObj.changefreq);
        const validChangefreq = changefreq && VALID_CHANGEFREQ.has(changefreq) ? changefreq : undefined;
        if (changefreq && !validChangefreq) {
          invalidTagValueCount += 1;
        }

        const priorityRaw = getText(entryObj.priority);
        let priority: number | undefined;
        if (priorityRaw) {
          const priorityValue = Number(priorityRaw);
          if (!Number.isFinite(priorityValue) || priorityValue < 0 || priorityValue > 1) {
            invalidTagValueCount += 1;
          } else {
            priority = priorityValue;
          }
        }

        urls.push({
          url: parsedUrl.href,
          lastModified: lastmod ?? undefined,
          changeFrequency: validChangefreq as SitemapEntry['changeFrequency'],
          priority,
        });
      }

      analysis.entries = urls;
      analysis.urlCount = urls.length;
      analysis.hasLastmod = urls.some(u => u.lastModified);

      // Check 4: URL count
      if (analysis.urlCount === 0) {
        checks.push({
          name: 'Sitemap URL Count',
          status: 'FAILED',
          severity: 'CRITICAL',
          message: `Sitemap contains 0 valid URLs${missingLocCount ? ` (${missingLocCount} entries missing <loc>)` : ''}`,
          fix: 'Ensure sitemap.ts fetches and returns all blog post URLs',
        });
      } else {
        checks.push({
          name: 'Sitemap URL Count',
          status: 'PASSED',
          severity: 'HIGH',
          message: `${analysis.urlCount} URLs found`,
          details: { urlCount: analysis.urlCount },
        });
      }

      // Check 5: lastmod tags
      if (!analysis.hasLastmod) {
        checks.push({
          name: 'Sitemap lastmod Tags',
          status: 'WARNING',
          severity: 'MEDIUM',
          message: 'No lastmod tags found - reduces freshness signals',
          fix: 'Add lastModified to sitemap entries',
        });
      } else {
        const urlsWithLastmod = urls.filter(u => u.lastModified).length;
        checks.push({
          name: 'Sitemap lastmod Tags',
          status: 'PASSED',
          severity: 'MEDIUM',
          message: `${urlsWithLastmod}/${analysis.urlCount} URLs have lastmod`,
        });
      }

      if (analysis.urlCount > 0) {
        const robotsResult = await checkUrlsAgainstRobots(
          baseUrl,
          urls.map((entry) => entry.url),
          ROBOTS_TEST_USER_AGENT
        );
        if (robotsResult.status === 'skipped') {
          checks.push({
            name: 'Sitemap URLs Blocked by robots.txt',
            status: 'WARNING',
            severity: 'MEDIUM',
            message: robotsResult.message ?? 'Robots.txt check skipped',
          });
        } else if (robotsResult.blocked.length > 0) {
          checks.push({
            name: 'Sitemap URLs Blocked by robots.txt',
            status: 'FAILED',
            severity: 'HIGH',
            message: `${robotsResult.blocked.length} sitemap URLs blocked by robots.txt`,
            fix: 'Remove disallow rules for URLs you want indexed or adjust sitemap scope',
            details: { blockedSamples: robotsResult.blocked.slice(0, 5) },
          });
        } else {
          checks.push({
            name: 'Sitemap URLs Blocked by robots.txt',
            status: 'PASSED',
            severity: 'HIGH',
            message: 'No sitemap URLs blocked by robots.txt',
          });
        }
      }
    }

    if (hasSitemapIndex) {
      const sitemapEntries = Array.isArray(sitemapIndex) ? sitemapIndex : [sitemapIndex];
      const totalSitemaps = sitemapEntries.length;
      analysis.entries = sitemapEntries
        .map((entry) => getText((entry as Record<string, unknown>).loc))
        .filter((loc): loc is string => Boolean(loc))
        .map((loc) => ({ url: loc }));
      analysis.urlCount = analysis.entries.length;

      if (totalSitemaps > MAX_SITEMAP_INDEX_ENTRIES) {
        checks.push({
          name: 'Too Many Sitemaps',
          status: 'FAILED',
          severity: 'CRITICAL',
          message: `Sitemap index has ${totalSitemaps} entries (limit ${MAX_SITEMAP_INDEX_ENTRIES})`,
          fix: 'Reduce sitemap index size to 50,000 entries or fewer',
          details: { totalSitemaps },
        });
      } else {
        checks.push({
          name: 'Too Many Sitemaps',
          status: 'PASSED',
          severity: 'HIGH',
          message: `${totalSitemaps} sitemaps listed`,
          details: { totalSitemaps },
        });
      }

      const nestedIndexSamples: string[] = [];
      const sitemapLocs: string[] = [];

      for (const entry of sitemapEntries) {
        const loc = getText((entry as Record<string, unknown>).loc);
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

        sitemapLocs.push(parsedUrl.href);

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

        const lastmod = getText((entry as Record<string, unknown>).lastmod);
        if (lastmod && Number.isNaN(Date.parse(lastmod))) {
          invalidDateCount += 1;
        }
      }

      const toCheck = sitemapLocs.slice(0, MAX_NESTED_INDEX_CHECKS);
      for (const loc of toCheck) {
        const childController = new AbortController();
        const childTimeoutId = setTimeout(() => childController.abort(), timeout);
        try {
          const childResponse = await fetch(loc, {
            headers: { 'User-Agent': userAgent },
            signal: childController.signal,
          });
          if (childResponse.ok) {
            const childText = await childResponse.text();
            const childParsed = xmlParser.parse(childText);
            if ((childParsed as { sitemapindex?: unknown }).sitemapindex) {
              addSample(nestedIndexSamples, loc);
            }
          }
        } catch {
          // Ignore nested index checks on fetch failures
        } finally {
          clearTimeout(childTimeoutId);
        }
      }

      if (nestedIndexSamples.length > 0) {
        checks.push({
          name: 'Nested Sitemap Indexes',
          status: 'FAILED',
          severity: 'CRITICAL',
          message: `${nestedIndexSamples.length} child sitemaps are sitemap indexes`,
          fix: 'Ensure sitemap indexes only point to URL sitemaps, not other indexes',
          details: { samples: nestedIndexSamples },
        });
      } else {
        checks.push({
          name: 'Nested Sitemap Indexes',
          status: 'PASSED',
          severity: 'HIGH',
          message: `Checked ${Math.min(totalSitemaps, MAX_NESTED_INDEX_CHECKS)} child sitemaps`,
          details: { checked: Math.min(totalSitemaps, MAX_NESTED_INDEX_CHECKS), totalSitemaps },
        });
      }

      checks.push({
        name: 'Sitemap Index Notice',
        status: 'WARNING',
        severity: 'MEDIUM',
        message: 'Sitemap index detected; audit child sitemaps for URL-level issues',
        fix: 'Run audits on child sitemap URLs listed in the index',
      });
    }

    if (missingLocCount > 0) {
      checks.push({
        name: 'Missing XML tag',
        status: 'FAILED',
        severity: 'HIGH',
        message: `${missingLocCount} entries missing <loc>`,
        fix: 'Ensure every <url> or <sitemap> entry includes a <loc> tag',
      });
    }

    if (invalidUrlCount > 0) {
      checks.push({
        name: 'Invalid URL',
        status: 'FAILED',
        severity: 'HIGH',
        message: `${invalidUrlCount} URLs are invalid or not absolute`,
        fix: 'Ensure all <loc> values are absolute URLs (https://...)',
        details: { samples: invalidUrlSamples },
      });
    }

    if (invalidDateCount > 0) {
      checks.push({
        name: 'Invalid Date',
        status: 'FAILED',
        severity: 'HIGH',
        message: `${invalidDateCount} lastmod values are invalid`,
        fix: 'Use W3C date format (YYYY-MM-DD or full ISO 8601)',
      });
    }

    if (invalidTagValueCount > 0) {
      checks.push({
        name: 'Invalid Tag Value',
        status: 'FAILED',
        severity: 'HIGH',
        message: `${invalidTagValueCount} changefreq/priority values are invalid`,
        fix: 'Use valid changefreq values and priority between 0.0 and 1.0',
      });
    }

    if (hostMismatchCount > 0 || pathMismatchCount > 0) {
      checks.push({
        name: 'URL Not Allowed',
        status: 'FAILED',
        severity: 'HIGH',
        message: `Found URLs outside the sitemap scope (host/path mismatch)`,
        fix: 'Only include URLs on the same host and within the sitemap directory scope',
        details: {
          hostMismatchCount,
          pathMismatchCount,
          samples: [...hostMismatchSamples, ...pathMismatchSamples].slice(0, 5),
        },
      });
    }

    if (wwwMismatchCount > 0) {
      checks.push({
        name: 'Path Mismatch (www)',
        status: 'FAILED',
        severity: 'HIGH',
        message: `${wwwMismatchCount} URLs differ only by www/non-www`,
        fix: 'Make sitemap host consistent with the canonical host (www vs non-www)',
      });
    }

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      checks.push({
        name: 'Sitemap Fetch',
        status: 'FAILED',
        severity: 'CRITICAL',
        message: `Sitemap fetch timed out after ${timeout}ms`,
        fix: 'Check if sitemap generation is too slow or hanging',
      });
    } else {
      checks.push({
        name: 'Sitemap Fetch',
        status: 'FAILED',
        severity: 'CRITICAL',
        message: error instanceof Error ? error.message : 'Failed to fetch sitemap',
        fix: 'Check if sitemap.xml is being served correctly',
      });
    }
  }

  analysis.issues = checks.filter(check => check.status !== 'PASSED');
  return { checks, analysis };
}

export type { SitemapValidatorOptions };
