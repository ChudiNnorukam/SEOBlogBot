// Core Web Vitals Analysis Tool

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { analyzePageSpeed } from '../services/pagespeed.js';

export function registerCoreWebVitalsTool(server: McpServer): void {
  server.registerTool(
    'analyze-core-web-vitals',
    {
      title: 'Analyze Core Web Vitals',
      description:
        'Get Core Web Vitals (LCP, INP, CLS) and performance score via PageSpeed Insights API. Essential for understanding Google ranking factors.',
      inputSchema: {
        url: z.string().url().describe('URL to analyze'),
        strategy: z
          .enum(['mobile', 'desktop'])
          .default('mobile')
          .describe('Device strategy (default: mobile - what Google uses for ranking)'),
      },
      outputSchema: {
        url: z.string(),
        strategy: z.enum(['mobile', 'desktop']),
        performanceScore: z.number(),
        metrics: z.object({
          lcp: z.object({
            value: z.number(),
            unit: z.string(),
            rating: z.enum(['good', 'needs_improvement', 'poor']),
          }),
          inp: z.object({
            value: z.number(),
            unit: z.string(),
            rating: z.enum(['good', 'needs_improvement', 'poor']),
          }),
          cls: z.object({
            value: z.number(),
            unit: z.string(),
            rating: z.enum(['good', 'needs_improvement', 'poor']),
          }),
          fcp: z.object({
            value: z.number(),
            unit: z.string(),
            rating: z.enum(['good', 'needs_improvement', 'poor']),
          }),
          ttfb: z.object({
            value: z.number(),
            unit: z.string(),
            rating: z.enum(['good', 'needs_improvement', 'poor']),
          }),
        }),
        opportunities: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            savings: z.string().nullable(),
          })
        ),
        diagnostics: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            description: z.string(),
          })
        ),
      },
    },
    async ({ url, strategy }) => {
      const apiKey = process.env['PAGESPEED_API_KEY'];

      try {
        const result = await analyzePageSpeed(url, strategy, apiKey);

        // Add context about the results
        let summary = `Performance Score: ${result.performanceScore}/100\n\n`;
        summary += 'Core Web Vitals:\n';
        summary += `  LCP: ${result.metrics.lcp.value}ms (${result.metrics.lcp.rating})\n`;
        summary += `  INP: ${result.metrics.inp.value}ms (${result.metrics.inp.rating})\n`;
        summary += `  CLS: ${result.metrics.cls.value} (${result.metrics.cls.rating})\n`;

        if (result.opportunities.length > 0) {
          summary += '\nTop Opportunities:\n';
          for (const opp of result.opportunities) {
            summary += `  - ${opp.title}: Save ${opp.savings}\n`;
          }
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
              text: `Failed to analyze Core Web Vitals: ${errorMessage}`,
            },
          ],
        };
      }
    }
  );
}
