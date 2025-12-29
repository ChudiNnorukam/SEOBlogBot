// scripts/validators/validate-canonical.ts
// Canonical URL validation module

import type { CheckResult } from '../../lib/types';

export interface CanonicalValidatorOptions {
  html: string;
  pageUrl: string;
}

export interface CanonicalAnalysis {
  present: boolean;
  value?: string;
  isAbsolute: boolean;
  isHttps: boolean;
  isSelfReferencing: boolean;
  normalizedCanonical?: string;
  normalizedPageUrl?: string;
}

/**
 * Normalize URL for comparison (remove trailing slash, lowercase host)
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Lowercase the hostname
    parsed.hostname = parsed.hostname.toLowerCase();
    // Remove default ports
    if ((parsed.protocol === 'https:' && parsed.port === '443') ||
        (parsed.protocol === 'http:' && parsed.port === '80')) {
      parsed.port = '';
    }
    // Remove trailing slash (unless it's the root)
    let path = parsed.pathname;
    if (path !== '/' && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    return `${parsed.protocol}//${parsed.host}${path}${parsed.search}`;
  } catch {
    return url.replace(/\/$/, '');
  }
}

/**
 * Validate canonical URL from HTML
 */
export function validateCanonical(options: CanonicalValidatorOptions): {
  checks: CheckResult[];
  analysis: CanonicalAnalysis;
} {
  const { html, pageUrl } = options;
  const checks: CheckResult[] = [];

  const analysis: CanonicalAnalysis = {
    present: false,
    isAbsolute: false,
    isHttps: false,
    isSelfReferencing: false,
  };

  // Extract canonical tag
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ||
                        html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);

  if (!canonicalMatch) {
    checks.push({
      name: 'Canonical Tag',
      status: 'FAILED',
      severity: 'CRITICAL',
      message: 'No canonical tag found on page',
      fix: 'Add alternates.canonical to metadata configuration',
    });
    return { checks, analysis };
  }

  analysis.present = true;
  analysis.value = canonicalMatch[1].trim();

  checks.push({
    name: 'Canonical Tag',
    status: 'PASSED',
    severity: 'CRITICAL',
    message: analysis.value,
  });

  // Check if absolute URL
  analysis.isAbsolute = analysis.value.startsWith('http://') || analysis.value.startsWith('https://');
  if (!analysis.isAbsolute) {
    checks.push({
      name: 'Canonical Absolute URL',
      status: 'FAILED',
      severity: 'HIGH',
      message: 'Canonical must be absolute URL, not relative',
      fix: 'Use metadataBase in layout.tsx to generate absolute URLs',
    });
  } else {
    checks.push({
      name: 'Canonical Absolute URL',
      status: 'PASSED',
      severity: 'HIGH',
    });

    // Check HTTPS
    analysis.isHttps = analysis.value.startsWith('https://');
    if (!analysis.isHttps) {
      checks.push({
        name: 'Canonical HTTPS',
        status: 'WARNING',
        severity: 'HIGH',
        message: 'Canonical uses HTTP instead of HTTPS',
        fix: 'Update metadataBase to use https://',
      });
    } else {
      checks.push({
        name: 'Canonical HTTPS',
        status: 'PASSED',
        severity: 'HIGH',
      });
    }

    // Check self-referencing
    analysis.normalizedCanonical = normalizeUrl(analysis.value);
    analysis.normalizedPageUrl = normalizeUrl(pageUrl);
    analysis.isSelfReferencing = analysis.normalizedCanonical === analysis.normalizedPageUrl;

    if (!analysis.isSelfReferencing) {
      // Check if it's pointing to a different domain entirely
      try {
        const canonicalHost = new URL(analysis.value).hostname;
        const pageHost = new URL(pageUrl).hostname;

        if (canonicalHost !== pageHost) {
          checks.push({
            name: 'Canonical Self-Reference',
            status: 'WARNING',
            severity: 'HIGH',
            message: `Canonical points to different domain: ${canonicalHost}`,
            fix: 'Verify this is intentional (cross-domain canonical)',
            details: { canonical: analysis.value, pageUrl },
          });
        } else {
          // Same domain but different path - might be intentional
          checks.push({
            name: 'Canonical Self-Reference',
            status: 'WARNING',
            severity: 'MEDIUM',
            message: 'Canonical URL differs from page URL',
            fix: 'Verify this is intentional (e.g., pagination, parameters)',
            details: {
              canonical: analysis.normalizedCanonical,
              pageUrl: analysis.normalizedPageUrl,
            },
          });
        }
      } catch {
        checks.push({
          name: 'Canonical Self-Reference',
          status: 'WARNING',
          severity: 'MEDIUM',
          message: 'Could not compare canonical to page URL',
        });
      }
    } else {
      checks.push({
        name: 'Canonical Self-Reference',
        status: 'PASSED',
        severity: 'MEDIUM',
        message: 'Canonical is self-referencing (correct)',
      });
    }

    // Check for trailing slash consistency
    const canonicalHasTrailingSlash = analysis.value.endsWith('/');
    const pageHasTrailingSlash = pageUrl.endsWith('/');
    if (canonicalHasTrailingSlash !== pageHasTrailingSlash && analysis.isSelfReferencing) {
      checks.push({
        name: 'Trailing Slash Consistency',
        status: 'WARNING',
        severity: 'LOW',
        message: 'Canonical and page URL have different trailing slash',
        fix: 'Configure trailingSlash in next.config.js for consistency',
      });
    }
  }

  return { checks, analysis };
}

/**
 * Fetch a page and validate its canonical URL
 */
export async function validatePageCanonical(options: {
  url: string;
  userAgent?: string;
  timeout?: number;
}): Promise<{
  checks: CheckResult[];
  analysis: CanonicalAnalysis;
}> {
  const { url, userAgent = 'SEOBlogBot/1.1', timeout = 10000 } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(url, {
    headers: { 'User-Agent': userAgent },
    signal: controller.signal,
  });

  clearTimeout(timeoutId);
  const html = await response.text();

  return validateCanonical({ html, pageUrl: url });
}

export type { CanonicalValidatorOptions, CanonicalAnalysis };
