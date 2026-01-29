// Lighthouse Audit Tool (PageSpeed Insights)

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

type LighthouseCategoryId = 'performance' | 'accessibility' | 'best-practices' | 'seo' | 'pwa';

const CATEGORY_CONFIG: Record<
  LighthouseCategoryId,
  { label: string; api: string }
> = {
  performance: { label: 'Performance', api: 'PERFORMANCE' },
  accessibility: { label: 'Accessibility', api: 'ACCESSIBILITY' },
  'best-practices': { label: 'Best Practices', api: 'BEST_PRACTICES' },
  seo: { label: 'SEO', api: 'SEO' },
  pwa: { label: 'PWA', api: 'PWA' },
};

interface LighthouseAudit {
  id?: string;
  title?: string;
  description?: string;
  score?: number | null;
  scoreDisplayMode?: string;
  displayValue?: string;
}

interface LighthouseResponse {
  lighthouseResult?: {
    categories?: Record<LighthouseCategoryId, { score?: number }>;
    audits?: Record<string, LighthouseAudit>;
  };
  error?: { message?: string };
}

export function registerLighthouseAuditTool(server: McpServer): void {
  server.registerTool(
    'audit-lighthouse',
    {
      title: 'Lighthouse Audit Checklist',
      description:
        'Run a Lighthouse-style checklist via PageSpeed Insights (performance, accessibility, best-practices, SEO, PWA).',
      inputSchema: {
        url: z.string().url().describe('URL to audit'),
        strategy: z.enum(['mobile', 'desktop']).default('mobile'),
        apiKey: z.string().optional().describe('Optional PageSpeed Insights API key'),
      },
      outputSchema: {
        url: z.string(),
        strategy: z.enum(['mobile', 'desktop']),
        categoryScores: z.record(z.string(), z.number()),
        topIssues: z.array(
          z.object({
            id: z.string().nullable(),
            title: z.string().nullable(),
            score: z.number().nullable(),
            displayValue: z.string().nullable(),
          })
        ),
        error: z.string().nullable(),
      },
    },
    async ({ url, strategy, apiKey }) => {
      try {
        const apiUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
        apiUrl.searchParams.set('url', url);
        apiUrl.searchParams.set('strategy', strategy);
        for (const config of Object.values(CATEGORY_CONFIG)) {
          apiUrl.searchParams.append('category', config.api);
        }
        if (apiKey) {
          apiUrl.searchParams.set('key', apiKey);
        }

        const response = await fetch(apiUrl.toString());
        const data = (await response.json()) as LighthouseResponse;

        if (!response.ok || data.error) {
          return {
            content: [
              {
                type: 'text',
                text: `Lighthouse audit failed: ${data.error?.message ?? response.status}`,
              },
            ],
          };
        }

        const categories = (data.lighthouseResult?.categories ?? {}) as Partial<
          Record<LighthouseCategoryId, { score?: number }>
        >;
        const audits = data.lighthouseResult?.audits ?? {};

        const categoryScores: Record<string, number> = {};
        for (const [id, config] of Object.entries(CATEGORY_CONFIG) as Array<
          [LighthouseCategoryId, typeof CATEGORY_CONFIG[LighthouseCategoryId]]
        >) {
          const score = categories[id]?.score;
          if (score !== undefined && score !== null) {
            categoryScores[config.label] = Math.round(score * 100);
          }
        }

        const topIssues = Object.values(audits)
          .filter((audit) => audit.score !== null && audit.score !== undefined)
          .filter((audit) => audit.scoreDisplayMode !== 'notApplicable' && audit.scoreDisplayMode !== 'manual')
          .filter((audit) => (audit.score ?? 1) < 0.9)
          .sort((a, b) => (a.score ?? 1) - (b.score ?? 1))
          .slice(0, 10)
          .map((audit) => ({
            id: audit.id ?? null,
            title: audit.title ?? null,
            score: audit.score ?? null,
            displayValue: audit.displayValue ?? null,
          }));

        const result = {
          url,
          strategy,
          categoryScores,
          topIssues,
          error: null,
        };

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text', text: `Lighthouse audit failed: ${message}` }],
        };
      }
    }
  );
}
