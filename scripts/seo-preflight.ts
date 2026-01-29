#!/usr/bin/env npx ts-node
/**
 * SEO Preflight Validation v1.1
 *
 * Master orchestrator for all SEO validation gates.
 * Blocks deployment if CRITICAL issues found.
 *
 * Usage:
 *   npx ts-node scripts/seo-preflight.ts [url] [options]
 *   npx ts-node scripts/seo-preflight.ts https://chudi-blog.vercel.app
 *   npx ts-node scripts/seo-preflight.ts http://localhost:3000 --crawl
 *   npx ts-node scripts/seo-preflight.ts http://localhost:3000 --json
 */

import type {
  CheckResult,
  GateResult,
  PreflightReport,
  SEOBlogBotConfig,
  DEFAULT_CONFIG,
} from '../lib/types';

import { validateSitemap } from './validators/validate-sitemap';
import { validateCrawlability } from './validators/validate-crawlability';
import { validateMeta } from './validators/validate-meta';
import { validateCanonical } from './validators/validate-canonical';
import { validateSchema } from './validators/validate-schema';
import { validatePerformance } from './validators/validate-performance';
import { validateRendering } from './validators/validate-rendering';
import { validateLighthouse } from './validators/validate-lighthouse';
import {
  crawlFromSitemap,
  crawlByLinks,
  generateCrawlSummaryChecks,
} from './crawlers/page-crawler';

// ============================================================================
// Configuration
// ============================================================================

const CONFIG: SEOBlogBotConfig = {
  baseUrl: 'http://localhost:3000',
  maxPagesToCheck: 20,
  timeout: 10000,
  userAgent: 'SEOBlogBot/1.1',
  thresholds: {
    minWordCount: 300,
    minTitleLength: 30,
    maxTitleLength: 60,
    minDescriptionLength: 120,
    maxDescriptionLength: 160,
    lcpThreshold: 2500,
    clsThreshold: 0.1,
    inpThreshold: 200,
  },
  gates: {
    sitemap: true,
    crawlability: true,
    indexability: true,
    metadata: true,
    schema: true,
    canonical: true,
    performance: true,
    rendering: true,
  },
};

const MOBILE_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 10; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

const extractVisibleText = (html: string): string => {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
};

const countVisibleWords = (html: string): number =>
  extractVisibleText(html)
    .split(' ')
    .filter((word) => word.length > 0).length;

// ============================================================================
// Gate Runner
// ============================================================================

type Status = 'PASSED' | 'FAILED' | 'WARNING' | 'SKIPPED';

async function runGate(
  name: string,
  validator: () => Promise<CheckResult[]>
): Promise<GateResult> {
  const start = Date.now();

  try {
    const checks = await validator();
    const hasCriticalFail = checks.some(
      (c) => c.status === 'FAILED' && c.severity === 'CRITICAL'
    );
    const hasWarning = checks.some((c) => c.status === 'WARNING');

    let status: Status = 'PASSED';
    if (hasCriticalFail) status = 'FAILED';
    else if (hasWarning) status = 'WARNING';

    return {
      gate: name,
      status,
      checks,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      gate: name,
      status: 'FAILED',
      checks: [
        {
          name: `${name} Execution`,
          status: 'FAILED',
          severity: 'CRITICAL',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
      duration: Date.now() - start,
    };
  }
}

// ============================================================================
// Main Orchestrator
// ============================================================================

interface PreflightOptions {
  crawlPages?: boolean;
  maxPages?: number;
  includePerformance?: boolean;
  includeLighthouse?: boolean;
  jsonOutput?: boolean;
  verbose?: boolean;
}

async function runSEOPreflight(
  url: string,
  options: PreflightOptions = {}
): Promise<PreflightReport> {
  const {
    crawlPages = false,
    maxPages = 10,
    includePerformance = true,
    includeLighthouse = true,
    verbose = true,
  } = options;

  const startTime = Date.now();
  const baseUrl = url.replace(/\/$/, '');
  const validatorOptions = { baseUrl, url: baseUrl, userAgent: CONFIG.userAgent, timeout: CONFIG.timeout };

  if (verbose) {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║   🔍 SEOBLOGBOT PREFLIGHT VALIDATION v1.1                     ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    console.log(`Target: ${baseUrl}`);
    console.log(`Crawl mode: ${crawlPages ? `Yes (max ${maxPages} pages)` : 'Homepage only'}\n`);
  }

  const gates: GateResult[] = [];
  let sitemapUrls: { url: string; lastModified?: string }[] = [];

  // Gate 1: Sitemap
  if (verbose) console.log('Gate 1/8: Sitemap Validation...');
  const sitemapGate = await runGate('Sitemap', async () => {
    const { checks, analysis } = await validateSitemap(validatorOptions);
    sitemapUrls = analysis.entries;
    return checks;
  });
  gates.push(sitemapGate);
  if (verbose) printGateResult(sitemapGate);

  // Gate 2: Crawlability
  if (verbose) console.log('Gate 2/8: Crawlability...');
  const crawlGate = await runGate('Crawlability', async () => {
    const { checks } = await validateCrawlability(validatorOptions);
    return checks;
  });
  gates.push(crawlGate);
  if (verbose) printGateResult(crawlGate);

  // Fetch homepage for remaining gates
  let homepageHtml = '';
  let mobileHtml = '';
  try {
    const response = await fetch(baseUrl, {
      headers: { 'User-Agent': CONFIG.userAgent! },
    });
    homepageHtml = await response.text();
  } catch (error) {
    if (verbose) console.error('Failed to fetch homepage:', error);
  }

  if (homepageHtml) {
    try {
      const response = await fetch(baseUrl, {
        headers: { 'User-Agent': MOBILE_USER_AGENT },
      });
      mobileHtml = await response.text();
    } catch (error) {
      if (verbose) console.error('Failed to fetch mobile homepage:', error);
    }
  }

  // Gate 3: Meta Tags
  if (verbose) console.log('Gate 3/8: Meta Tags...');
  const metaGate = await runGate('Meta Tags', async () => {
    if (!homepageHtml) {
      return [{
        name: 'Meta Tags',
        status: 'SKIPPED' as Status,
        severity: 'HIGH' as const,
        message: 'Could not fetch homepage',
      }];
    }
    const { checks } = validateMeta({
      html: homepageHtml,
      url: baseUrl,
      mobileHtml,
      thresholds: CONFIG.thresholds,
    });

    if (mobileHtml) {
      const desktopWords = countVisibleWords(homepageHtml);
      const mobileWords = countVisibleWords(mobileHtml);
      if (desktopWords > 0) {
        const ratio = mobileWords / desktopWords;
        if (ratio < 0.7) {
          checks.push({
            name: 'Mobile Content Parity',
            status: 'WARNING',
            severity: 'MEDIUM',
            message: `Mobile content is ${Math.round(ratio * 100)}% of desktop (${mobileWords} vs ${desktopWords} words)`,
            fix: 'Ensure mobile content matches desktop content for indexing parity',
          });
        } else {
          checks.push({
            name: 'Mobile Content Parity',
            status: 'PASSED',
            severity: 'LOW',
            message: `Mobile content parity OK (${mobileWords}/${desktopWords} words)`,
          });
        }
      }
    }

    return checks;
  });
  gates.push(metaGate);
  if (verbose) printGateResult(metaGate);

  // Gate 4: Canonical URLs
  if (verbose) console.log('Gate 4/8: Canonical URLs...');
  const canonicalGate = await runGate('Canonical', async () => {
    if (!homepageHtml) {
      return [{
        name: 'Canonical',
        status: 'SKIPPED' as Status,
        severity: 'CRITICAL' as const,
        message: 'Could not fetch homepage',
      }];
    }
    const { checks } = validateCanonical({
      html: homepageHtml,
      pageUrl: baseUrl,
    });
    return checks;
  });
  gates.push(canonicalGate);
  if (verbose) printGateResult(canonicalGate);

  // Gate 5: JSON-LD Schema
  if (verbose) console.log('Gate 5/8: JSON-LD Schema...');
  const schemaGate = await runGate('Schema', async () => {
    if (!homepageHtml) {
      return [{
        name: 'Schema',
        status: 'SKIPPED' as Status,
        severity: 'MEDIUM' as const,
        message: 'Could not fetch homepage',
      }];
    }
    const { checks } = validateSchema({
      html: homepageHtml,
      url: baseUrl,
      mobileHtml,
    });
    return checks;
  });
  gates.push(schemaGate);
  if (verbose) printGateResult(schemaGate);

  // Gate 6: Rendering parity (optional)
  if (verbose) console.log('Gate 6/8: Rendering...');
  const renderGate = await runGate('Rendering', async () => {
    if (!homepageHtml) {
      return [{
        name: 'Rendering',
        status: 'SKIPPED' as Status,
        severity: 'MEDIUM' as const,
        message: 'Could not fetch homepage',
      }];
    }
    const { checks } = await validateRendering({
      url: baseUrl,
      userAgent: CONFIG.userAgent,
      timeout: CONFIG.timeout,
    });
    return checks;
  });
  gates.push(renderGate);
  if (verbose) printGateResult(renderGate);

  // Gate 7: Lighthouse Checklist (optional)
  if (includeLighthouse) {
    if (verbose) console.log('Gate 7/8: Lighthouse Checklist...');
    const lighthouseGate = await runGate('Lighthouse', async () => {
      const { checks } = await validateLighthouse({
        url: baseUrl,
        strategy: 'mobile',
        apiKey: process.env.PAGESPEED_API_KEY,
        timeout: CONFIG.timeout,
      });
      return checks;
    });
    gates.push(lighthouseGate);
    if (verbose) printGateResult(lighthouseGate);
  } else if (verbose) {
    console.log('Gate 7/8: Lighthouse Checklist... SKIPPED');
  }

  // Gate 8: Performance (optional)
  if (includePerformance) {
    if (verbose) console.log('Gate 8/8: Performance...');
    const perfGate = await runGate('Performance', async () => {
      const { checks } = await validatePerformance(validatorOptions);
      return checks;
    });
    gates.push(perfGate);
    if (verbose) printGateResult(perfGate);
  }

  // Optional: Multi-page crawl
  let pagesCrawled = 1;
  if (crawlPages && sitemapUrls.length > 0) {
    if (verbose) {
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('MULTI-PAGE CRAWL');
      console.log('═══════════════════════════════════════════════════════════════\n');
      console.log(`Crawling up to ${maxPages} pages from sitemap...`);
    }

    const crawlResult = await crawlFromSitemap(sitemapUrls, baseUrl, {
      maxPages,
      timeout: CONFIG.timeout,
      userAgent: CONFIG.userAgent,
    });

    pagesCrawled = crawlResult.totalPages;
    const crawlChecks = generateCrawlSummaryChecks(crawlResult);

    const crawlGateResult: GateResult = {
      gate: 'Multi-Page Crawl',
      status: crawlChecks.some((c) => c.status === 'FAILED') ? 'FAILED' :
              crawlChecks.some((c) => c.status === 'WARNING') ? 'WARNING' : 'PASSED',
      checks: crawlChecks,
      duration: crawlResult.duration,
    };

    gates.push(crawlGateResult);
    if (verbose) {
      console.log(`\nCrawled ${pagesCrawled} pages in ${crawlResult.duration}ms`);
      printGateResult(crawlGateResult);
    }
  }

  // Collect all checks
  const allChecks = gates.flatMap((g) => g.checks);
  const criticalIssues = allChecks.filter(
    (c) => c.status === 'FAILED' && c.severity === 'CRITICAL'
  );

  const summary = {
    total: allChecks.length,
    passed: allChecks.filter((c) => c.status === 'PASSED').length,
    failed: allChecks.filter((c) => c.status === 'FAILED').length,
    warnings: allChecks.filter((c) => c.status === 'WARNING').length,
    skipped: allChecks.filter((c) => c.status === 'SKIPPED').length,
  };

  const passed = criticalIssues.length === 0;

  // Generate recommendations
  const recommendations: string[] = [];
  if (criticalIssues.length > 0) {
    recommendations.push('Fix CRITICAL issues before deploying');
    criticalIssues.forEach((issue) => {
      if (issue.fix) {
        recommendations.push(`• ${issue.name}: ${issue.fix}`);
      }
    });
  }

  const report: PreflightReport = {
    url: baseUrl,
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
    passed,
    summary,
    gates,
    criticalIssues,
    recommendations,
    pagesCrawled,
  };

  // Print summary
  if (verbose) {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('PREFLIGHT SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`Total Checks: ${summary.total}`);
    console.log(`  ✅ Passed:   ${summary.passed}`);
    console.log(`  ❌ Failed:   ${summary.failed}`);
    console.log(`  ⚠️  Warnings: ${summary.warnings}`);
    console.log(`  ⏭️  Skipped:  ${summary.skipped}\n`);

    if (criticalIssues.length > 0) {
      console.log('🚨 CRITICAL ISSUES:\n');
      criticalIssues.forEach((issue) => {
        console.log(`  ❌ ${issue.name}`);
        console.log(`     ${issue.message}`);
        if (issue.fix) {
          console.log(`     Fix: ${issue.fix}`);
        }
        console.log('');
      });
    }

    console.log(`Duration: ${report.duration}ms`);
    console.log(`Pages Checked: ${pagesCrawled}`);
    console.log(`Result: ${passed ? '✅ PASSED' : '🛑 BLOCKED'}\n`);

    if (!passed) {
      console.error('SEO PREFLIGHT FAILED - FIX CRITICAL ISSUES BEFORE DEPLOYING\n');
    }
  }

  return report;
}

function printGateResult(gate: GateResult): void {
  const icon = gate.status === 'PASSED' ? '✅' :
               gate.status === 'WARNING' ? '⚠️' : '❌';
  console.log(`  ${icon} ${gate.status} (${gate.duration}ms)\n`);
}

// ============================================================================
// CLI Entry Point
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const url = args.find((a) => a.startsWith('http')) || 'http://localhost:3000';
  const crawlPages = args.includes('--crawl');
  const jsonOutput = args.includes('--json');
  const maxPagesArg = args.find((a) => a.startsWith('--max-pages='));
  const maxPages = maxPagesArg ? parseInt(maxPagesArg.split('=')[1], 10) : 10;
  const noPerf = args.includes('--no-perf');
  const noLighthouse = args.includes('--no-lighthouse');
  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    console.log(`
SEOBlogBot Preflight Validation v1.1

Usage:
  npx ts-node scripts/seo-preflight.ts [url] [options]

Options:
  --crawl           Crawl multiple pages from sitemap (default: homepage only)
  --max-pages=N     Maximum pages to crawl (default: 10)
  --json            Output JSON report instead of console
  --no-perf         Skip performance checks
  --no-lighthouse   Skip Lighthouse checklist
  --help, -h        Show this help message

Examples:
  npx ts-node scripts/seo-preflight.ts https://example.com
  npx ts-node scripts/seo-preflight.ts https://example.com --crawl --max-pages=20
  npx ts-node scripts/seo-preflight.ts http://localhost:3000 --json > report.json
`);
    process.exit(0);
  }

  try {
    const report = await runSEOPreflight(url, {
      crawlPages,
      maxPages,
      includePerformance: !noPerf,
      includeLighthouse: !noLighthouse,
      jsonOutput,
      verbose: !jsonOutput,
    });

    if (jsonOutput) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      // Write report to file
      const fs = await import('fs');
      fs.writeFileSync('seo-report.json', JSON.stringify(report, null, 2));
      console.log('Report saved to seo-report.json\n');
    }

    if (!report.passed) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Preflight error:', error);
    process.exit(1);
  }
}

main();

// Export for use as module
export { runSEOPreflight };
export type { PreflightOptions };
