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
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
      });
      const parsed = parser.parse(response.body);

      // Handle standard sitemap
      if (parsed.urlset?.url) {
        const urlEntries = Array.isArray(parsed.urlset.url)
          ? parsed.urlset.url
          : [parsed.urlset.url];

        urls = urlEntries
          .map((entry: { loc?: string }) => entry.loc)
          .filter((loc: string | undefined): loc is string => typeof loc === 'string');

        // Check for common issues
        const entriesWithoutLastmod = urlEntries.filter(
          (entry: { lastmod?: string }) => !entry.lastmod
        );
        if (entriesWithoutLastmod.length > 0) {
          issues.push({
            type: 'warning',
            message: `${entriesWithoutLastmod.length} URLs missing lastmod date. This helps search engines understand content freshness.`,
          });
        }
      }

      // Handle sitemap index
      if (parsed.sitemapindex?.sitemap) {
        const sitemaps = Array.isArray(parsed.sitemapindex.sitemap)
          ? parsed.sitemapindex.sitemap
          : [parsed.sitemapindex.sitemap];

        urls = sitemaps
          .map((entry: { loc?: string }) => entry.loc)
          .filter((loc: string | undefined): loc is string => typeof loc === 'string');

        issues.push({
          type: 'warning',
          message: `This is a sitemap index with ${urls.length} child sitemaps. Run audit on individual sitemaps for detailed analysis.`,
        });
      }

      if (urls.length === 0 && !parsed.sitemapindex) {
        issues.push({
          type: 'error',
          message: 'Sitemap contains no URLs. Check XML structure.',
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
