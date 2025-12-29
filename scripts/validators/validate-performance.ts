// scripts/validators/validate-performance.ts
// Core Web Vitals and performance validation module
// Note: Full CWV requires browser automation (Playwright/Puppeteer) or PageSpeed API

import type { CheckResult, CoreWebVitals, PerformanceGrade, CWV_THRESHOLDS } from '../../lib/types';

export interface PerformanceValidatorOptions {
  url: string;
  userAgent?: string;
  timeout?: number;
  usePageSpeedApi?: boolean;
  pageSpeedApiKey?: string;
}

export interface PerformanceAnalysis {
  url: string;
  ttfb: number;
  totalLoadTime: number;
  contentLength: number;
  compression: boolean;
  cacheControl?: string;
  transferSize?: number;
  cwv?: CoreWebVitals;
  grades: PerformanceGrade[];
}

const CWV_THRESHOLDS_LOCAL = {
  lcp: { good: 2500, poor: 4000 },
  fcp: { good: 1800, poor: 3000 },
  inp: { good: 200, poor: 500 },
  cls: { good: 0.1, poor: 0.25 },
  ttfb: { good: 800, poor: 1800 },
};

/**
 * Calculate grade for a metric
 */
function gradeMetric(
  metric: keyof typeof CWV_THRESHOLDS_LOCAL,
  value: number
): PerformanceGrade {
  const threshold = CWV_THRESHOLDS_LOCAL[metric];
  let grade: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';

  if (value <= threshold.good) {
    grade = 'GOOD';
  } else if (value <= threshold.poor) {
    grade = 'NEEDS_IMPROVEMENT';
  } else {
    grade = 'POOR';
  }

  return { metric, value, threshold, grade };
}

/**
 * Basic performance validation (server-side metrics only)
 * For full CWV, use PageSpeed Insights API or browser automation
 */
export async function validatePerformance(options: PerformanceValidatorOptions): Promise<{
  checks: CheckResult[];
  analysis: PerformanceAnalysis;
}> {
  const { url, userAgent = 'SEOBlogBot/1.1', timeout = 10000 } = options;
  const checks: CheckResult[] = [];

  const analysis: PerformanceAnalysis = {
    url,
    ttfb: 0,
    totalLoadTime: 0,
    contentLength: 0,
    compression: false,
    grades: [],
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const startTime = performance.now();

    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept-Encoding': 'gzip, deflate, br',
      },
      signal: controller.signal,
    });

    const ttfb = performance.now() - startTime;
    analysis.ttfb = Math.round(ttfb);

    // Get response body to measure total load time
    const body = await response.text();
    const totalLoadTime = performance.now() - startTime;
    analysis.totalLoadTime = Math.round(totalLoadTime);

    clearTimeout(timeoutId);

    // Analyze headers
    analysis.contentLength = parseInt(response.headers.get('content-length') || '0', 10) || body.length;
    analysis.compression = !!response.headers.get('content-encoding');
    analysis.cacheControl = response.headers.get('cache-control') || undefined;

    // Grade TTFB
    const ttfbGrade = gradeMetric('ttfb', analysis.ttfb);
    analysis.grades.push(ttfbGrade);

    // TTFB Check
    if (ttfbGrade.grade === 'GOOD') {
      checks.push({
        name: 'Time to First Byte (TTFB)',
        status: 'PASSED',
        severity: 'MEDIUM',
        message: `${analysis.ttfb}ms (good < ${CWV_THRESHOLDS_LOCAL.ttfb.good}ms)`,
      });
    } else if (ttfbGrade.grade === 'NEEDS_IMPROVEMENT') {
      checks.push({
        name: 'Time to First Byte (TTFB)',
        status: 'WARNING',
        severity: 'MEDIUM',
        message: `${analysis.ttfb}ms (needs improvement, target < ${CWV_THRESHOLDS_LOCAL.ttfb.good}ms)`,
        fix: 'Optimize server response time, use CDN, enable edge caching',
      });
    } else {
      checks.push({
        name: 'Time to First Byte (TTFB)',
        status: 'WARNING',
        severity: 'MEDIUM',
        message: `${analysis.ttfb}ms (poor, target < ${CWV_THRESHOLDS_LOCAL.ttfb.good}ms)`,
        fix: 'Optimize server response time, use CDN, enable edge caching',
      });
    }

    // Compression check
    if (analysis.compression) {
      checks.push({
        name: 'Compression',
        status: 'PASSED',
        severity: 'LOW',
        message: 'Response is compressed',
      });
    } else {
      checks.push({
        name: 'Compression',
        status: 'WARNING',
        severity: 'LOW',
        message: 'Response is not compressed',
        fix: 'Enable gzip/brotli compression in server config',
      });
    }

    // Cache control check
    if (analysis.cacheControl) {
      const hasMaxAge = analysis.cacheControl.includes('max-age');
      const isNoStore = analysis.cacheControl.includes('no-store');

      if (isNoStore) {
        checks.push({
          name: 'Cache Control',
          status: 'WARNING',
          severity: 'LOW',
          message: 'Page is not cached (no-store)',
          fix: 'Consider enabling caching for static pages',
        });
      } else if (hasMaxAge) {
        checks.push({
          name: 'Cache Control',
          status: 'PASSED',
          severity: 'LOW',
          message: `Caching enabled: ${analysis.cacheControl}`,
        });
      }
    } else {
      checks.push({
        name: 'Cache Control',
        status: 'WARNING',
        severity: 'LOW',
        message: 'No Cache-Control header',
        fix: 'Add Cache-Control headers for better performance',
      });
    }

    // Total load time (informational)
    checks.push({
      name: 'Total Load Time',
      status: analysis.totalLoadTime < 3000 ? 'PASSED' : 'WARNING',
      severity: 'LOW',
      message: `${analysis.totalLoadTime}ms (server response + body download)`,
    });

    // Add note about full CWV
    checks.push({
      name: 'Core Web Vitals Note',
      status: 'SKIPPED',
      severity: 'LOW',
      message: 'Full CWV (LCP, CLS, INP) requires PageSpeed Insights API or browser automation',
      fix: 'Run `npx lighthouse <url>` or use PageSpeed Insights for complete CWV data',
    });

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      checks.push({
        name: 'Performance Check',
        status: 'FAILED',
        severity: 'MEDIUM',
        message: `Request timed out after ${timeout}ms`,
        fix: 'Page load time exceeds timeout - investigate performance issues',
      });
    } else {
      checks.push({
        name: 'Performance Check',
        status: 'FAILED',
        severity: 'MEDIUM',
        message: error instanceof Error ? error.message : 'Failed to measure performance',
      });
    }
  }

  return { checks, analysis };
}

/**
 * Get PageSpeed Insights data (requires API key)
 * This provides full Core Web Vitals data
 */
export async function getPageSpeedInsights(options: {
  url: string;
  apiKey: string;
  strategy?: 'mobile' | 'desktop';
}): Promise<{
  checks: CheckResult[];
  cwv: CoreWebVitals;
} | null> {
  const { url, apiKey, strategy = 'mobile' } = options;

  try {
    const apiUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
    apiUrl.searchParams.set('url', url);
    apiUrl.searchParams.set('key', apiKey);
    apiUrl.searchParams.set('strategy', strategy);
    apiUrl.searchParams.set('category', 'PERFORMANCE');

    const response = await fetch(apiUrl.toString());

    if (!response.ok) {
      console.error(`PageSpeed API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const audits = data.lighthouseResult?.audits;

    if (!audits) {
      return null;
    }

    const cwv: CoreWebVitals = {
      lcp: audits['largest-contentful-paint']?.numericValue,
      fcp: audits['first-contentful-paint']?.numericValue,
      cls: audits['cumulative-layout-shift']?.numericValue,
      ttfb: audits['server-response-time']?.numericValue,
      // INP is not directly available in API, use TBT as proxy
    };

    const checks: CheckResult[] = [];

    // LCP
    if (cwv.lcp !== undefined) {
      const grade = gradeMetric('lcp', cwv.lcp);
      checks.push({
        name: 'Largest Contentful Paint (LCP)',
        status: grade.grade === 'GOOD' ? 'PASSED' : 'WARNING',
        severity: 'MEDIUM',
        message: `${Math.round(cwv.lcp)}ms (${grade.grade.toLowerCase()})`,
        fix: grade.grade !== 'GOOD' ? 'Optimize images, reduce blocking resources' : undefined,
      });
    }

    // CLS
    if (cwv.cls !== undefined) {
      const grade = gradeMetric('cls', cwv.cls);
      checks.push({
        name: 'Cumulative Layout Shift (CLS)',
        status: grade.grade === 'GOOD' ? 'PASSED' : 'WARNING',
        severity: 'MEDIUM',
        message: `${cwv.cls.toFixed(3)} (${grade.grade.toLowerCase()})`,
        fix: grade.grade !== 'GOOD' ? 'Add width/height to images, reserve space for dynamic content' : undefined,
      });
    }

    // FCP
    if (cwv.fcp !== undefined) {
      const grade = gradeMetric('fcp', cwv.fcp);
      checks.push({
        name: 'First Contentful Paint (FCP)',
        status: grade.grade === 'GOOD' ? 'PASSED' : 'WARNING',
        severity: 'MEDIUM',
        message: `${Math.round(cwv.fcp)}ms (${grade.grade.toLowerCase()})`,
      });
    }

    return { checks, cwv };

  } catch (error) {
    console.error('PageSpeed API error:', error);
    return null;
  }
}

export type { PerformanceValidatorOptions, PerformanceAnalysis };
