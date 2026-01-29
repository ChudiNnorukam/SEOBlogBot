// scripts/validators/validate-lighthouse.ts
// Lighthouse checklist via PageSpeed Insights API (all categories)

import type { CheckResult } from '../../lib/types';

export interface LighthouseValidatorOptions {
  url: string;
  strategy?: 'mobile' | 'desktop';
  apiKey?: string;
  timeout?: number;
}

type LighthouseCategoryId = 'performance' | 'accessibility' | 'best-practices' | 'seo' | 'pwa';

const CATEGORY_CONFIG: Record<
  LighthouseCategoryId,
  { label: string; api: string; severity: CheckResult['severity'] }
> = {
  performance: { label: 'Performance', api: 'PERFORMANCE', severity: 'HIGH' },
  accessibility: { label: 'Accessibility', api: 'ACCESSIBILITY', severity: 'MEDIUM' },
  'best-practices': { label: 'Best Practices', api: 'BEST_PRACTICES', severity: 'MEDIUM' },
  seo: { label: 'SEO', api: 'SEO', severity: 'HIGH' },
  pwa: { label: 'PWA', api: 'PWA', severity: 'LOW' },
};

const SCORE_THRESHOLDS = {
  good: 90,
  warn: 50,
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

export async function validateLighthouse(options: LighthouseValidatorOptions): Promise<{
  checks: CheckResult[];
}> {
  const { url, strategy = 'mobile', apiKey, timeout = 20000 } = options;
  const checks: CheckResult[] = [];

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(apiUrl.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    const data = (await response.json()) as LighthouseResponse;
    if (!response.ok || data.error) {
      checks.push({
        name: 'Lighthouse Checklist',
        status: 'WARNING',
        severity: 'MEDIUM',
        message: data.error?.message ?? `PageSpeed API error: ${response.status}`,
      });
      return { checks };
    }

    const categories = data.lighthouseResult?.categories ?? {};
    const audits = data.lighthouseResult?.audits ?? {};

    for (const [id, config] of Object.entries(CATEGORY_CONFIG) as Array<
      [LighthouseCategoryId, typeof CATEGORY_CONFIG[LighthouseCategoryId]]
    >) {
      const score = categories[id]?.score;
      if (score === undefined || score === null) {
        checks.push({
          name: `Lighthouse ${config.label}`,
          status: 'SKIPPED',
          severity: config.severity,
          message: 'Category score not available',
        });
        continue;
      }

      const scorePercent = Math.round(score * 100);
      let status: CheckResult['status'] = 'PASSED';
      if (scorePercent < SCORE_THRESHOLDS.good && scorePercent >= SCORE_THRESHOLDS.warn) {
        status = 'WARNING';
      } else if (scorePercent < SCORE_THRESHOLDS.warn) {
        status = 'WARNING';
      }

      checks.push({
        name: `Lighthouse ${config.label}`,
        status,
        severity: config.severity,
        message: `${scorePercent}/100`,
        details: { score: scorePercent, strategy },
      });
    }

    const failingAudits = Object.values(audits)
      .filter((audit) => audit.score !== null && audit.score !== undefined)
      .filter((audit) => audit.scoreDisplayMode !== 'notApplicable' && audit.scoreDisplayMode !== 'manual')
      .filter((audit) => (audit.score ?? 1) < 0.9)
      .sort((a, b) => (a.score ?? 1) - (b.score ?? 1))
      .slice(0, 7)
      .map((audit) => ({
        id: audit.id,
        title: audit.title,
        score: audit.score,
        displayValue: audit.displayValue,
      }));

    if (failingAudits.length > 0) {
      checks.push({
        name: 'Lighthouse Top Issues',
        status: 'WARNING',
        severity: 'MEDIUM',
        message: `${failingAudits.length} notable Lighthouse audits below 90`,
        details: { audits: failingAudits },
      });
    }
  } catch (error) {
    checks.push({
      name: 'Lighthouse Checklist',
      status: 'WARNING',
      severity: 'MEDIUM',
      message: error instanceof Error ? error.message : 'Failed to run Lighthouse checklist',
    });
  }

  return { checks };
}

export type { LighthouseValidatorOptions };
