// Indexing Status Tool (Google Search Console)

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { inspectUrl } from '../services/search-console.js';
import { isGoogleAuthConfigured } from '../services/google-auth.js';

export function registerIndexingStatusTool(server: McpServer): void {
  server.registerTool(
    'check-indexing-status',
    {
      title: 'Check Indexing Status',
      description:
        'Check if a URL is indexed in Google using the Search Console API. Requires Google Cloud service account with Search Console access.',
      inputSchema: {
        url: z.string().url().describe('URL to check indexing status for'),
        siteUrl: z
          .string()
          .describe(
            'GSC property URL (e.g., https://example.com/ - must match exactly what is in Search Console, including trailing slash)'
          ),
      },
      outputSchema: {
        url: z.string(),
        indexingState: z.enum(['INDEXED', 'NOT_INDEXED', 'UNKNOWN']),
        verdict: z.string(),
        lastCrawlTime: z.string().nullable(),
        crawlability: z.object({
          verdict: z.string(),
          robotsTxtState: z.string().nullable(),
        }),
        indexability: z.object({
          verdict: z.string(),
          reason: z.string().nullable(),
        }),
        mobileFriendly: z.boolean().nullable(),
        richResults: z.array(z.string()),
      },
    },
    async ({ url, siteUrl }) => {
      // Check if auth is configured before making request
      if (!isGoogleAuthConfigured()) {
        return {
          content: [
            {
              type: 'text',
              text: `Google Search Console API not configured.

To use this tool, you need to:
1. Create a Google Cloud project
2. Enable the Search Console API
3. Create a service account and download the JSON key
4. Add the service account email as a user in your Search Console property
5. Set GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-key.json

See README for detailed setup instructions.`,
            },
          ],
        };
      }

      try {
        const result = await inspectUrl(url, siteUrl);

        // Build human-readable summary
        let summary = `Indexing Status for ${url}\n`;
        summary += `${'='.repeat(50)}\n\n`;

        if (result.indexingState === 'INDEXED') {
          summary += '✅ INDEXED - This page is in Google index\n';
        } else if (result.indexingState === 'NOT_INDEXED') {
          summary += '❌ NOT INDEXED - This page is not in Google index\n';
        } else {
          summary += '❓ UNKNOWN - Could not determine indexing status\n';
        }

        summary += `\nVerdict: ${result.verdict}\n`;

        if (result.lastCrawlTime) {
          summary += `Last Crawled: ${result.lastCrawlTime}\n`;
        }

        summary += `\nCrawlability: ${result.crawlability.verdict}`;
        if (result.crawlability.robotsTxtState) {
          summary += ` (robots.txt: ${result.crawlability.robotsTxtState})`;
        }
        summary += '\n';

        summary += `Indexability: ${result.indexability.verdict}`;
        if (result.indexability.reason) {
          summary += ` (${result.indexability.reason})`;
        }
        summary += '\n';

        if (result.mobileFriendly !== null) {
          summary += `Mobile Friendly: ${result.mobileFriendly ? 'Yes' : 'No'}\n`;
        }

        if (result.richResults.length > 0) {
          summary += `Rich Results: ${result.richResults.join(', ')}\n`;
        }

        return {
          content: [
            { type: 'text', text: summary },
            { type: 'text', text: JSON.stringify(result, null, 2) },
          ],
          structuredContent: result,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: 'text',
              text: `Failed to check indexing status: ${errorMessage}`,
            },
          ],
        };
      }
    }
  );
}
