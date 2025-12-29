// scripts/validators/validate-sitemap.ts
// Sitemap validation module

import type { CheckResult, SitemapAnalysis, SitemapEntry } from '../../lib/types';

export interface SitemapValidatorOptions {
  baseUrl: string;
  userAgent?: string;
  timeout?: number;
}

/**
 * Validate sitemap accessibility and content
 */
export async function validateSitemap(options: SitemapValidatorOptions): Promise<{
  checks: CheckResult[];
  analysis: SitemapAnalysis;
}> {
  const { baseUrl, userAgent = 'SEOBlogBot/1.1', timeout = 10000 } = options;
  const sitemapUrl = `${baseUrl}/sitemap.xml`;
  const checks: CheckResult[] = [];

  const analysis: SitemapAnalysis = {
    accessible: false,
    statusCode: 0,
    contentType: '',
    isValidXml: false,
    urlCount: 0,
    entries: [],
    hasLastmod: false,
    issues: [],
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(sitemapUrl, {
      headers: { 'User-Agent': userAgent },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    analysis.statusCode = response.status;
    analysis.contentType = response.headers.get('content-type') || '';

    // Check 1: HTTP Status
    if (!response.ok) {
      const severity = response.status >= 500 ? 'CRITICAL' : 'CRITICAL';
      checks.push({
        name: 'Sitemap HTTP Status',
        status: 'FAILED',
        severity,
        message: `Sitemap returned ${response.status} ${response.statusText}`,
        fix: response.status >= 500
          ? 'Add `export const dynamic = "force-dynamic"` to app/sitemap.ts'
          : 'Create app/sitemap.ts using the template',
      });
      return { checks, analysis };
    }

    analysis.accessible = true;
    checks.push({
      name: 'Sitemap HTTP Status',
      status: 'PASSED',
      severity: 'CRITICAL',
      message: '200 OK',
    });

    // Check 2: Content-Type
    if (!analysis.contentType.includes('xml')) {
      checks.push({
        name: 'Sitemap Content-Type',
        status: 'FAILED',
        severity: 'HIGH',
        message: `Expected XML, got: ${analysis.contentType}`,
        fix: 'Ensure sitemap.ts returns MetadataRoute.Sitemap type',
      });
    } else {
      checks.push({
        name: 'Sitemap Content-Type',
        status: 'PASSED',
        severity: 'HIGH',
        message: analysis.contentType,
      });
    }

    // Parse content
    const text = await response.text();

    // Check 3: Valid XML structure
    if (!text.includes('<?xml') && !text.includes('<urlset')) {
      checks.push({
        name: 'Sitemap XML Structure',
        status: 'FAILED',
        severity: 'CRITICAL',
        message: 'Response is not valid XML sitemap format',
        fix: 'Check for middleware blocking or error pages rendering instead of XML',
      });
      return { checks, analysis };
    }

    analysis.isValidXml = true;

    // Extract URLs
    const urlMatches = text.matchAll(/<loc>([^<]+)<\/loc>/g);
    const urls: SitemapEntry[] = [];

    for (const match of urlMatches) {
      const url = match[1].trim();
      // Try to extract lastmod for this URL
      const urlSection = text.substring(
        text.lastIndexOf('<url>', text.indexOf(match[0])),
        text.indexOf('</url>', text.indexOf(match[0])) + 6
      );
      const lastmodMatch = urlSection.match(/<lastmod>([^<]+)<\/lastmod>/);
      const changeFreqMatch = urlSection.match(/<changefreq>([^<]+)<\/changefreq>/);
      const priorityMatch = urlSection.match(/<priority>([^<]+)<\/priority>/);

      urls.push({
        url,
        lastModified: lastmodMatch?.[1],
        changeFrequency: changeFreqMatch?.[1] as SitemapEntry['changeFrequency'],
        priority: priorityMatch ? parseFloat(priorityMatch[1]) : undefined,
      });
    }

    analysis.entries = urls;
    analysis.urlCount = urls.length;
    analysis.hasLastmod = urls.some(u => u.lastModified);

    // Check 4: URL count
    if (analysis.urlCount === 0) {
      checks.push({
        name: 'Sitemap URL Count',
        status: 'FAILED',
        severity: 'CRITICAL',
        message: 'Sitemap contains 0 URLs',
        fix: 'Ensure sitemap.ts fetches and returns all blog post URLs',
      });
    } else {
      checks.push({
        name: 'Sitemap URL Count',
        status: 'PASSED',
        severity: 'HIGH',
        message: `${analysis.urlCount} URLs found`,
        details: { urlCount: analysis.urlCount },
      });
    }

    // Check 5: lastmod tags
    if (!analysis.hasLastmod) {
      checks.push({
        name: 'Sitemap lastmod Tags',
        status: 'WARNING',
        severity: 'MEDIUM',
        message: 'No lastmod tags found - reduces freshness signals',
        fix: 'Add lastModified to sitemap entries',
      });
    } else {
      const urlsWithLastmod = urls.filter(u => u.lastModified).length;
      checks.push({
        name: 'Sitemap lastmod Tags',
        status: 'PASSED',
        severity: 'MEDIUM',
        message: `${urlsWithLastmod}/${analysis.urlCount} URLs have lastmod`,
      });
    }

    // Check 6: Valid URL format
    const invalidUrls = urls.filter(u => !u.url.startsWith('http'));
    if (invalidUrls.length > 0) {
      checks.push({
        name: 'Sitemap URL Format',
        status: 'WARNING',
        severity: 'HIGH',
        message: `${invalidUrls.length} URLs are not absolute`,
        fix: 'All sitemap URLs must be absolute (start with https://)',
        details: { invalidUrls: invalidUrls.slice(0, 5).map(u => u.url) },
      });
    }

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      checks.push({
        name: 'Sitemap Fetch',
        status: 'FAILED',
        severity: 'CRITICAL',
        message: `Sitemap fetch timed out after ${timeout}ms`,
        fix: 'Check if sitemap generation is too slow or hanging',
      });
    } else {
      checks.push({
        name: 'Sitemap Fetch',
        status: 'FAILED',
        severity: 'CRITICAL',
        message: error instanceof Error ? error.message : 'Failed to fetch sitemap',
        fix: 'Check if sitemap.xml is being served correctly',
      });
    }
  }

  return { checks, analysis };
}

export type { SitemapValidatorOptions };
