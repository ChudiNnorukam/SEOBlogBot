// Robots.txt Check Tool

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchUrl, joinUrl } from '../services/http-client.js';
import type { RobotsCheckResult, Issue, UserAgentRule } from '../types/index.js';
import { parseRobotsTxt, pickRobotsGroup, evaluateRobotsRules } from '../utils/robots.js';

const MAX_ROBOTS_SIZE_BYTES = 500 * 1024;
const DEFAULT_USER_AGENT = 'Googlebot';

export function registerCheckRobotsTool(server: McpServer): void {
  server.registerTool(
    'check-robots-txt',
    {
      title: 'Check Robots.txt',
      description:
        'Verify robots.txt configuration, crawl rules, and sitemap references. Identifies issues that could block search engine indexing.',
      inputSchema: {
        siteUrl: z.string().url().describe('Base URL of the site (e.g., https://example.com)'),
        testUrls: z
          .array(z.string().url())
          .optional()
          .describe('Optional URLs to evaluate against robots.txt rules'),
        userAgent: z
          .string()
          .default(DEFAULT_USER_AGENT)
          .describe('User-agent to evaluate rules for (default: Googlebot)'),
      },
      outputSchema: {
        accessible: z.boolean(),
        statusCode: z.number(),
        content: z.string().nullable(),
        allowsIndexing: z.boolean(),
        sitemapReferences: z.array(z.string()),
        evaluatedUrls: z.array(
          z.object({
            url: z.string(),
            allowed: z.boolean(),
            matchedRule: z.string().nullable(),
          })
        ),
        issues: z.array(
          z.object({
            type: z.enum(['warning', 'error']),
            message: z.string(),
          })
        ),
        userAgentRules: z.array(
          z.object({
            userAgent: z.string(),
            disallow: z.array(z.string()),
            allow: z.array(z.string()),
          })
        ),
      },
    },
    async ({ siteUrl, testUrls, userAgent }) => {
      const result = await checkRobotsTxt(siteUrl, testUrls ?? [], userAgent ?? DEFAULT_USER_AGENT);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    }
  );
}

async function checkRobotsTxt(
  siteUrl: string,
  testUrls: string[],
  userAgent: string
): Promise<RobotsCheckResult & { evaluatedUrls: { url: string; allowed: boolean; matchedRule: string | null }[] }> {
  const issues: Issue[] = [];
  const robotsUrl = joinUrl(siteUrl, '/robots.txt');
  const evaluatedUrls: { url: string; allowed: boolean; matchedRule: string | null }[] = [];

  let response;
  try {
    response = await fetchUrl(robotsUrl);
  } catch (error) {
    return {
      accessible: false,
      statusCode: 0,
      content: null,
      allowsIndexing: true, // No robots.txt = allow all
      sitemapReferences: [],
      evaluatedUrls: [],
      issues: [
        {
          type: 'warning',
          message: `Could not fetch robots.txt: ${error instanceof Error ? error.message : 'Unknown error'}. Site will be fully crawlable by default.`,
        },
      ],
      userAgentRules: [],
    };
  }

  const accessible = response.status >= 200 && response.status < 300;

  if (response.status === 404) {
    return {
      accessible: false,
      statusCode: 404,
      content: null,
      allowsIndexing: true,
      sitemapReferences: [],
      evaluatedUrls: [],
      issues: [
        {
          type: 'warning',
          message:
            'No robots.txt found (404). Consider creating one to specify sitemap location and crawl directives.',
        },
      ],
      userAgentRules: [],
    };
  }

  if (!accessible) {
    issues.push({
      type: 'error',
      message: `robots.txt returned HTTP ${response.status}`,
    });
  }

  const content = response.body;
  const fileSizeBytes = Buffer.byteLength(content ?? '', 'utf8');
  if (fileSizeBytes > MAX_ROBOTS_SIZE_BYTES) {
    issues.push({
      type: 'warning',
      message: `robots.txt exceeds 500KB limit (${(fileSizeBytes / 1024).toFixed(1)}KB). Google may ignore it.`,
    });
  }
  const lines = content.split('\n').map((line) => line.trim());

  // Parse robots.txt
  const sitemapReferences: string[] = [];
  const userAgentRules: UserAgentRule[] = [];
  let currentUserAgent: string | null = null;
  let currentRule: UserAgentRule | null = null;
  let allowsIndexing = true;

  for (const line of lines) {
    // Skip comments and empty lines
    if (line.startsWith('#') || line === '') continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const directive = line.substring(0, colonIndex).trim().toLowerCase();
    const value = line.substring(colonIndex + 1).trim();

    switch (directive) {
      case 'user-agent':
        if (currentRule && currentUserAgent) {
          userAgentRules.push(currentRule);
        }
        currentUserAgent = value;
        currentRule = {
          userAgent: value,
          disallow: [],
          allow: [],
        };
        break;

      case 'disallow':
        if (currentRule) {
          currentRule.disallow.push(value);
          // Check if blocking everything for Googlebot or all
          if (
            value === '/' &&
            (currentUserAgent === '*' ||
              currentUserAgent?.toLowerCase().includes('googlebot'))
          ) {
            allowsIndexing = false;
            issues.push({
              type: 'error',
              message: `Disallow: / for ${currentUserAgent} blocks all crawling!`,
            });
          }
        }
        break;

      case 'allow':
        if (currentRule) {
          currentRule.allow.push(value);
        }
        break;

      case 'sitemap':
        sitemapReferences.push(value);
        break;
    }
  }

  // Push last rule
  if (currentRule && currentUserAgent) {
    userAgentRules.push(currentRule);
  }

  const groups = parseRobotsTxt(content);
  const group = pickRobotsGroup(userAgent, groups) ?? pickRobotsGroup('*', groups);
  if (group) {
    const ruleCheck = evaluateRobotsRules('/', group.rules);
    if (!ruleCheck.allowed) {
      allowsIndexing = false;
      issues.push({
        type: 'error',
        message: `Robots rules block ${userAgent} from crawling "/".`,
      });
    }
  }

  if (group && testUrls.length > 0) {
    for (const url of testUrls) {
      try {
        const parsedUrl = new URL(url);
        const path = `${parsedUrl.pathname}${parsedUrl.search}`;
        const evaluation = evaluateRobotsRules(path, group.rules);
        evaluatedUrls.push({
          url,
          allowed: evaluation.allowed,
          matchedRule: evaluation.matchedRule ? `${evaluation.matchedRule.type}:${evaluation.matchedRule.path}` : null,
        });
      } catch {
        evaluatedUrls.push({ url, allowed: true, matchedRule: null });
      }
    }
  }

  // Check for common issues
  if (sitemapReferences.length === 0) {
    issues.push({
      type: 'warning',
      message:
        'No Sitemap directive found. Add "Sitemap: https://yoursite.com/sitemap.xml" to help search engines discover your sitemap.',
    });
  }

  // Check for problematic patterns
  const hasApiDisallow = userAgentRules.some((rule) =>
    rule.disallow.some((d) => d.includes('/api'))
  );
  if (!hasApiDisallow) {
    issues.push({
      type: 'warning',
      message:
        'Consider adding "Disallow: /api/" to prevent crawling of API endpoints.',
    });
  }

  // Check for _next disallow (Next.js specific)
  const hasNextDisallow = userAgentRules.some((rule) =>
    rule.disallow.some((d) => d.includes('/_next'))
  );
  if (!hasNextDisallow) {
    issues.push({
      type: 'warning',
      message:
        'For Next.js sites, consider adding "Disallow: /_next/" to prevent crawling of build artifacts.',
    });
  }

  return {
    accessible,
    statusCode: response.status,
    content: accessible ? content : null,
    allowsIndexing,
    sitemapReferences,
    evaluatedUrls,
    issues,
    userAgentRules,
  };
}
