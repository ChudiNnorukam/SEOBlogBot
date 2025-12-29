// PageSpeed Insights API Service

import type { CoreWebVitalsResult, MetricResult, Opportunity, Diagnostic } from '../types/index.js';

const PAGESPEED_API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

// Core Web Vitals thresholds (2024+)
const THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 }, // milliseconds
  inp: { good: 200, poor: 500 }, // milliseconds (replaced FID)
  cls: { good: 0.1, poor: 0.25 }, // unitless
  fcp: { good: 1800, poor: 3000 }, // milliseconds
  ttfb: { good: 800, poor: 1800 }, // milliseconds
};

interface PageSpeedAudit {
  id?: string;
  title?: string;
  description?: string;
  numericValue?: number;
  displayValue?: string;
  details?: {
    overallSavingsMs?: number;
  };
}

interface PageSpeedResponse {
  lighthouseResult?: {
    categories?: {
      performance?: {
        score?: number;
      };
    };
    audits?: Record<string, PageSpeedAudit>;
  };
  loadingExperience?: {
    metrics?: Record<
      string,
      {
        percentile?: number;
        category?: string;
      }
    >;
  };
  error?: {
    message?: string;
  };
}

export async function analyzePageSpeed(
  url: string,
  strategy: 'mobile' | 'desktop' = 'mobile',
  apiKey?: string
): Promise<CoreWebVitalsResult> {
  const params = new URLSearchParams({
    url,
    strategy,
    category: 'performance',
  });

  if (apiKey) {
    params.set('key', apiKey);
  }

  const response = await fetch(`${PAGESPEED_API_URL}?${params.toString()}`);
  const data = (await response.json()) as PageSpeedResponse;

  if (data.error) {
    throw new Error(`PageSpeed API error: ${data.error.message}`);
  }

  const lighthouse = data.lighthouseResult;
  const audits = lighthouse?.audits ?? {};

  // Extract performance score
  const performanceScore = Math.round((lighthouse?.categories?.performance?.score ?? 0) * 100);

  // Extract metrics
  const metrics = {
    lcp: extractMetric(audits['largest-contentful-paint'], 'lcp', 'ms'),
    inp: extractMetric(audits['interaction-to-next-paint'] ?? audits['max-potential-fid'], 'inp', 'ms'),
    cls: extractMetric(audits['cumulative-layout-shift'], 'cls', ''),
    fcp: extractMetric(audits['first-contentful-paint'], 'fcp', 'ms'),
    ttfb: extractMetric(audits['server-response-time'], 'ttfb', 'ms'),
  };

  // Extract opportunities (performance improvements)
  const opportunityIds = [
    'render-blocking-resources',
    'unused-css-rules',
    'unused-javascript',
    'modern-image-formats',
    'offscreen-images',
    'unminified-css',
    'unminified-javascript',
    'efficient-animated-content',
    'uses-long-cache-ttl',
    'uses-responsive-images',
  ];

  const opportunities: Opportunity[] = opportunityIds
    .map((id): Opportunity | null => {
      const audit = audits[id];
      if (!audit || !audit.details?.overallSavingsMs) return null;
      return {
        id,
        title: audit.title ?? id,
        savings: `${Math.round(audit.details.overallSavingsMs)}ms`,
      };
    })
    .filter((o): o is Opportunity => o !== null)
    .slice(0, 5);

  // Extract diagnostics
  const diagnosticIds = [
    'mainthread-work-breakdown',
    'bootup-time',
    'dom-size',
    'font-display',
    'third-party-summary',
  ];

  const diagnostics: Diagnostic[] = diagnosticIds
    .map((id) => {
      const audit = audits[id];
      if (!audit) return null;
      return {
        id,
        title: audit.title ?? id,
        description: audit.displayValue ?? '',
      };
    })
    .filter((d): d is Diagnostic => d !== null);

  return {
    url,
    strategy,
    performanceScore,
    metrics,
    opportunities,
    diagnostics,
  };
}

function extractMetric(
  audit: PageSpeedAudit | undefined,
  metricType: keyof typeof THRESHOLDS,
  unit: string
): MetricResult {
  const value = audit?.numericValue ?? 0;
  const threshold = THRESHOLDS[metricType];

  let rating: MetricResult['rating'];
  if (value <= threshold.good) {
    rating = 'good';
  } else if (value <= threshold.poor) {
    rating = 'needs_improvement';
  } else {
    rating = 'poor';
  }

  return { value: Math.round(value), unit, rating };
}
