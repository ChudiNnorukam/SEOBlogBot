/**
 * Sitemap Conflict Detection & Validation
 *
 * Prevents common sitemap issues:
 * 1. Static file overriding dynamic route
 * 2. Wrong domain in sitemap URLs
 * 3. Stale edge cache serving old content
 * 4. URL domain mismatch with GSC property
 *
 * Usage:
 *   npx tsx scripts/validators/validate-sitemap-conflicts.ts <target-url>
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { CheckResult } from '../../lib/types';

interface SitemapConflictReport {
  hasStaticFile: boolean;
  hasDynamicRoute: boolean;
  staticFileAge?: number;
  fetchedDomain?: string;
  expectedDomain: string;
  urlSamplesDomain?: string[];
  cacheAge?: number;
  issues: string[];
  warnings: string[];
  recommendations: string[];
}

export async function validateSitemapConflicts(targetUrl: string): Promise<CheckResult> {
  const report: SitemapConflictReport = {
    hasStaticFile: false,
    hasDynamicRoute: false,
    expectedDomain: new URL(targetUrl).hostname,
    issues: [],
    warnings: [],
    recommendations: []
  };

  const startTime = Date.now();

  try {
    // 1. Check for static/dynamic file conflicts
    checkFileConflicts(report);

    // 2. Fetch and validate sitemap
    const sitemapUrl = new URL('/sitemap.xml', targetUrl).href;
    const sitemapResponse = await fetch(sitemapUrl, {
      timeout: 10000
    });

    if (!sitemapResponse.ok) {
      report.issues.push(`Sitemap fetch failed: ${sitemapResponse.status} ${sitemapResponse.statusText}`);
      return generateResult(report, startTime, 'failed');
    }

    // 3. Check cache headers
    const cacheControl = sitemapResponse.headers.get('cache-control');
    const age = parseInt(sitemapResponse.headers.get('age') || '0');
    report.cacheAge = age;

    if (age > 7200) { // 2 hours
      report.warnings.push(`Sitemap cache very old: ${age}s (${Math.round(age / 3600)}h)`);
      report.recommendations.push('Force Vercel redeploy to clear edge cache');
    }

    if (!cacheControl || !cacheControl.includes('max-age')) {
      report.issues.push('Missing cache-control headers on sitemap');
      report.recommendations.push('Add Cache-Control headers to sitemap endpoint');
    }

    // 4. Parse and validate sitemap content
    const sitemapContent = await sitemapResponse.text();
    validateSitemapContent(sitemapContent, report, targetUrl);

    // 5. Determine overall status
    const status = report.issues.length > 0 ? 'failed' : report.warnings.length > 0 ? 'warning' : 'passed';

    return generateResult(report, startTime, status);

  } catch (error) {
    report.issues.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
    return generateResult(report, startTime, 'failed');
  }
}

function checkFileConflicts(report: SitemapConflictReport): void {
  const cwd = process.cwd();

  // Check for static sitemap
  const staticPath = join(cwd, 'static', 'sitemap.xml');
  if (existsSync(staticPath)) {
    report.hasStaticFile = true;
    const stats = require('fs').statSync(staticPath);
    report.staticFileAge = Math.floor((Date.now() - stats.mtimeMs) / 1000);
    report.issues.push(`Static sitemap exists: static/sitemap.xml (${report.staticFileAge}s old)`);
    report.recommendations.push('Delete static/sitemap.xml to prevent override');
  }

  // Check for dynamic route
  const routePath = join(cwd, 'src', 'routes', 'sitemap.xml', '+server.ts');
  if (existsSync(routePath)) {
    report.hasDynamicRoute = true;
  }

  // Flag conflict
  if (report.hasStaticFile && report.hasDynamicRoute) {
    report.issues.push('CONFLICT: Both static and dynamic sitemap exist!');
    report.recommendations.push('Delete static/sitemap.xml immediately (takes priority over route)');
  }

  if (report.hasStaticFile && !report.hasDynamicRoute) {
    report.warnings.push('Only static sitemap detected - cannot adapt to domain changes');
  }

  if (!report.hasStaticFile && !report.hasDynamicRoute) {
    report.warnings.push('No sitemap found in codebase');
  }
}

function validateSitemapContent(
  content: string,
  report: SitemapConflictReport,
  targetUrl: string
): void {
  try {
    // Extract URLs from sitemap
    const urlMatches = content.match(/<loc>([^<]+)<\/loc>/g) || [];
    const urls = urlMatches.map(match => match.replace(/<\/?loc>/g, ''));

    if (urls.length === 0) {
      report.issues.push('Sitemap contains no URLs');
      return;
    }

    // Sample URLs for domain check
    const sampleUrls = urls.slice(0, 5);
    report.urlSamplesDomain = sampleUrls;

    // Extract domain from first URL
    if (urls.length > 0) {
      try {
        const firstUrl = new URL(urls[0]);
        report.fetchedDomain = firstUrl.hostname;

        // Check domain match
        if (report.fetchedDomain !== report.expectedDomain) {
          report.issues.push(
            `Domain mismatch: Sitemap has '${report.fetchedDomain}' but expected '${report.expectedDomain}'`
          );
          report.recommendations.push(
            `Update sitemap to use request.url.origin instead of hardcoded domain`
          );
        }
      } catch {
        report.issues.push('Could not parse first URL in sitemap');
      }
    }

    // Check for hardcoded old domain
    if (content.includes('chudi.dev')) {
      report.issues.push('Sitemap contains hardcoded chudi.dev URLs');
      report.recommendations.push('Use dynamic origin from request: const origin = new URL(request.url).origin');
    }

    // Warn about very large sitemaps
    if (urls.length > 40000) {
      report.warnings.push(`Sitemap has ${urls.length} URLs (near 50000 limit)`);
      report.recommendations.push('Consider splitting into sitemap index');
    }

  } catch (error) {
    report.issues.push(`Content parsing error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function generateResult(report: SitemapConflictReport, startTime: number, status: 'passed' | 'failed' | 'warning'): CheckResult {
  const duration = Date.now() - startTime;

  return {
    name: 'Sitemap Conflicts',
    status,
    duration,
    message: generateMessage(report),
    issues: report.issues,
    warnings: report.warnings,
    suggestions: report.recommendations,
    context: {
      staticFile: report.hasStaticFile,
      dynamicRoute: report.hasDynamicRoute,
      domain: {
        expected: report.expectedDomain,
        fetched: report.fetchedDomain,
        match: report.expectedDomain === report.fetchedDomain
      },
      cache: {
        ageSeconds: report.cacheAge,
        status: report.cacheAge && report.cacheAge < 7200 ? 'fresh' : 'stale'
      }
    }
  };
}

function generateMessage(report: SitemapConflictReport): string {
  if (report.issues.length > 0) {
    return `❌ ${report.issues.length} critical issue(s) found`;
  }
  if (report.warnings.length > 0) {
    return `⚠️  ${report.warnings.length} warning(s) - review recommendations`;
  }
  return '✅ Sitemap configuration healthy';
}

// CLI execution
if (require.main === module) {
  const targetUrl = process.argv[2] || 'https://chudi-blog.vercel.app';

  validateSitemapConflicts(targetUrl)
    .then(result => {
      console.log(`\n${result.status === 'passed' ? '✅' : result.status === 'warning' ? '⚠️ ' : '❌'} ${result.message}`);
      console.log(`\nTime: ${result.duration}ms\n`);

      if (result.issues && result.issues.length > 0) {
        console.log('🔴 Issues:');
        result.issues.forEach(issue => console.log(`   - ${issue}`));
        console.log('');
      }

      if (result.warnings && result.warnings.length > 0) {
        console.log('🟡 Warnings:');
        result.warnings.forEach(warning => console.log(`   - ${warning}`));
        console.log('');
      }

      if (result.suggestions && result.suggestions.length > 0) {
        console.log('💡 Recommendations:');
        result.suggestions.forEach(suggestion => console.log(`   - ${suggestion}`));
        console.log('');
      }

      process.exit(result.status === 'passed' ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation error:', error);
      process.exit(1);
    });
}
