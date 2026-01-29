// Indexing Status Batch Tool (Google Search Console)

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { inspectUrl } from '../services/search-console.js';
import { isGoogleAuthConfigured } from '../services/google-auth.js';

export function registerIndexingStatusBatchTool(server: McpServer): void {
  server.registerTool(
    'check-indexing-status-batch',
    {
      title: 'Check Indexing Status (Batch)',
      description:
        'Check indexing status for multiple URLs via the Search Console URL Inspection API. Use sparingly due to quota limits.',
      inputSchema: {
        urls: z
          .array(z.string().url())
          .min(1)
          .max(20)
          .describe('URLs to check (max 20 per batch to avoid quota issues)'),
        siteUrl: z
          .string()
          .describe(
            'GSC property URL (e.g., https://example.com/ - must match Search Console exactly, including trailing slash)'
          ),
      },
      outputSchema: {
        siteUrl: z.string(),
        results: z.array(
          z.object({
            url: z.string(),
            indexingState: z.enum(['INDEXED', 'NOT_INDEXED', 'UNKNOWN']).nullable(),
            verdict: z.string().nullable(),
            lastCrawlTime: z.string().nullable(),
            crawlability: z
              .object({
                verdict: z.string(),
                robotsTxtState: z.string().nullable(),
              })
              .nullable(),
            indexability: z
              .object({
                verdict: z.string(),
                reason: z.string().nullable(),
              })
              .nullable(),
            mobileFriendly: z.boolean().nullable(),
            richResults: z.array(z.string()),
            error: z.string().nullable(),
          })
        ),
        summary: z.object({
          total: z.number(),
          indexed: z.number(),
          notIndexed: z.number(),
          unknown: z.number(),
          errors: z.number(),
        }),
      },
    },
    async ({ urls, siteUrl }) => {
      if (!isGoogleAuthConfigured()) {
        return {
          content: [
            {
              type: 'text',
              text: `Google Search Console API not configured.\n\nSet GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLIENT_EMAIL/GOOGLE_PRIVATE_KEY and grant the service account access to the Search Console property.`,
            },
          ],
        };
      }

      const results = [];
      let indexed = 0;
      let notIndexed = 0;
      let unknown = 0;
      let errors = 0;

      for (const url of urls) {
        try {
          const result = await inspectUrl(url, siteUrl);
          if (result.indexingState === 'INDEXED') indexed += 1;
          else if (result.indexingState === 'NOT_INDEXED') notIndexed += 1;
          else unknown += 1;

          results.push({
            ...result,
            error: null,
          });
        } catch (error) {
          errors += 1;
          results.push({
            url,
            indexingState: null,
            verdict: null,
            lastCrawlTime: null,
            crawlability: null,
            indexability: null,
            mobileFriendly: null,
            richResults: [],
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const summary = {
        total: results.length,
        indexed,
        notIndexed,
        unknown,
        errors,
      };

      return {
        content: [{ type: 'text', text: JSON.stringify({ siteUrl, results, summary }, null, 2) }],
        structuredContent: { siteUrl, results, summary },
      };
    }
  );
}
