// scripts/crawlers/page-crawler.ts
// Multi-page crawler for comprehensive SEO validation

import type { CheckResult, PageAnalysis, CrawlOptions, CrawlResult, SitemapEntry } from '../../lib/types';
import { createHash } from 'node:crypto';
import { validateMeta } from '../validators/validate-meta';
import { validateCanonical } from '../validators/validate-canonical';
import { validateSchema } from '../validators/validate-schema';
import { parseRobotsTxt, pickRobotsGroup, evaluateRobotsRules } from '../utils/robots';

const DEFAULT_CRAWL_OPTIONS: CrawlOptions = {
  maxPages: 20,
  timeout: 10000,
  userAgent: 'SEOBlogBot/1.1',
  followLinks: true,
  respectRobots: true,
  includeExternalLinks: false,
};

/**
 * Extract internal links from HTML
 */
function extractLinks(html: string, baseUrl: string): { internal: string[]; external: string[] } {
  const internal: Set<string> = new Set();
  const external: Set<string> = new Set();
  const baseHost = new URL(baseUrl).hostname;

  const linkMatches = html.matchAll(/<a[^>]*href=["']([^"'#]+)["']/gi);

  for (const match of linkMatches) {
    let href = match[1].trim();

    // Skip empty, javascript, mailto links
    if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      continue;
    }

    // Convert relative URLs to absolute
    try {
      const absoluteUrl = new URL(href, baseUrl);
      const cleanUrl = `${absoluteUrl.origin}${absoluteUrl.pathname}`;

      if (absoluteUrl.hostname === baseHost) {
        // Skip API routes, static files, etc.
        if (!cleanUrl.includes('/api/') &&
            !cleanUrl.includes('/_next/') &&
            !cleanUrl.match(/\.(jpg|jpeg|png|gif|svg|css|js|ico|woff|woff2)$/i)) {
          internal.add(cleanUrl);
        }
      } else {
        external.add(cleanUrl);
      }
    } catch {
      // Invalid URL, skip
    }
  }

  return {
    internal: [...internal],
    external: [...external],
  };
}

/**
 * Extract images and their alt attributes
 */
function extractImages(html: string): { total: number; withAlt: number; withoutAlt: string[] } {
  const withoutAlt: string[] = [];
  let total = 0;
  let withAlt = 0;

  const imgMatches = html.matchAll(/<img[^>]*>/gi);

  for (const match of imgMatches) {
    total++;
    const imgTag = match[0];
    const hasAlt = /alt=["'][^"']*["']/i.test(imgTag);
    const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);

    if (hasAlt) {
      withAlt++;
    } else if (srcMatch) {
      withoutAlt.push(srcMatch[1]);
    }
  }

  return { total, withAlt, withoutAlt };
}

/**
 * Extract heading structure
 */
function extractHeadings(html: string): { h1: string[]; h2: string[]; h3: string[] } {
  const h1: string[] = [];
  const h2: string[] = [];
  const h3: string[] = [];

  const h1Matches = html.matchAll(/<h1[^>]*>([^<]*)<\/h1>/gi);
  const h2Matches = html.matchAll(/<h2[^>]*>([^<]*)<\/h2>/gi);
  const h3Matches = html.matchAll(/<h3[^>]*>([^<]*)<\/h3>/gi);

  for (const match of h1Matches) h1.push(match[1].trim());
  for (const match of h2Matches) h2.push(match[1].trim());
  for (const match of h3Matches) h3.push(match[1].trim());

  return { h1, h2, h3 };
}

/**
 * Count words in page content (excluding scripts and styles)
 */
function countWords(html: string): number {
  const text = extractVisibleText(html);
  return text.split(' ').filter(w => w.length > 0).length;
}

/**
 * Extract visible text for content comparisons
 */
function extractVisibleText(html: string): string {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, '');
}

async function buildRobotsEvaluator(
  baseUrl: string,
  userAgent: string,
  timeout: number
): Promise<((url: string) => { allowed: boolean; rule?: string }) | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/robots.txt`, {
      headers: { 'User-Agent': userAgent },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) return null;

    const text = await response.text();
    const groups = parseRobotsTxt(text);
    const group = pickRobotsGroup(userAgent, groups) ?? pickRobotsGroup('*', groups);
    if (!group) return null;

    return (url: string) => {
      try {
        const parsed = new URL(url);
        const path = `${parsed.pathname}${parsed.search}`;
        const evaluation = evaluateRobotsRules(path, group.rules);
        return {
          allowed: evaluation.allowed,
          rule: evaluation.matchedRule ? `${evaluation.matchedRule.type}:${evaluation.matchedRule.path}` : undefined,
        };
      } catch {
        return { allowed: true };
      }
    };
  } catch {
    return null;
  }
}

/**
 * Analyze a single page
 */
export async function analyzePage(
  url: string,
  options: Partial<CrawlOptions> = {}
): Promise<PageAnalysis> {
  const { timeout = 10000, userAgent = 'SEOBlogBot/1.1' } = options;
  const startTime = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(url, {
    headers: { 'User-Agent': userAgent },
    signal: controller.signal,
    redirect: 'follow',
  });

  clearTimeout(timeoutId);
  const html = await response.text();
  const loadTime = Date.now() - startTime;

  // Extract headers
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // Run validators
  const { metadata } = validateMeta({ html, url });
  const { schemas } = validateSchema({ html, url, isArticlePage: url.includes('/blog/') });
  const { analysis: canonicalAnalysis } = validateCanonical({ html, pageUrl: url });

  // Extract additional data
  const links = extractLinks(html, url);
  const images = extractImages(html);
  const headings = extractHeadings(html);
  const visibleText = extractVisibleText(html);
  const wordCount = visibleText.split(' ').filter(w => w.length > 0).length;
  const contentHash = visibleText
    ? createHash('sha256').update(visibleText.toLowerCase()).digest('hex')
    : undefined;

  // Collect issues
  const issues: PageAnalysis['issues'] = [];

  // Check for thin content
  if (wordCount < 300 && !url.endsWith('/')) {
    issues.push({
      id: 'THIN_CONTENT',
      category: 'internal-linking',
      severity: 'MEDIUM',
      message: `Page has thin content (${wordCount} words)`,
      fix: 'Add more substantive content or consider noindex',
    });
  }

  // Check H1
  if (headings.h1.length === 0) {
    issues.push({
      id: 'NO_H1',
      category: 'meta',
      severity: 'HIGH',
      message: 'Page has no H1 heading',
      fix: 'Add a single H1 heading describing the page content',
    });
  } else if (headings.h1.length > 1) {
    issues.push({
      id: 'MULTIPLE_H1',
      category: 'meta',
      severity: 'MEDIUM',
      message: `Page has ${headings.h1.length} H1 headings`,
      fix: 'Use only one H1 per page',
    });
  }

  // Check images without alt
  if (images.withoutAlt.length > 0) {
    issues.push({
      id: 'IMAGE_MISSING_ALT',
      category: 'meta',
      severity: 'MEDIUM',
      message: `${images.withoutAlt.length} images missing alt text`,
      fix: 'Add descriptive alt text to all images',
    });
  }

  // Add canonical to metadata
  metadata.canonical = canonicalAnalysis.value;
  metadata.xRobotsTag = headers['x-robots-tag'];

  return {
    url,
    statusCode: response.status,
    headers,
    metadata,
    schemas,
    wordCount,
    contentHash,
    headingStructure: headings,
    internalLinks: links.internal,
    externalLinks: links.external,
    images,
    issues,
    loadTime,
  };
}

/**
 * Crawl multiple pages starting from sitemap URLs
 */
export async function crawlFromSitemap(
  sitemapUrls: SitemapEntry[],
  baseUrl: string,
  options: Partial<CrawlOptions> = {}
): Promise<CrawlResult> {
  const opts = { ...DEFAULT_CRAWL_OPTIONS, ...options };
  const startTime = Date.now();
  const pages: PageAnalysis[] = [];
  const errors: string[] = [];
  const blockedUrls: string[] = [];
  const robotsEvaluator = opts.respectRobots
    ? await buildRobotsEvaluator(baseUrl, opts.userAgent, opts.timeout)
    : null;

  // Limit to maxPages
  const urlsToCrawl = sitemapUrls.slice(0, opts.maxPages);

  for (const entry of urlsToCrawl) {
    try {
      if (robotsEvaluator) {
        const evaluation = robotsEvaluator(entry.url);
        if (!evaluation.allowed) {
          blockedUrls.push(entry.url);
          continue;
        }
      }
      const analysis = await analyzePage(entry.url, opts);
      pages.push(analysis);
    } catch (error) {
      errors.push(`Failed to analyze ${entry.url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    pagesAnalyzed: pages,
    totalPages: pages.length,
    duration: Date.now() - startTime,
    errors,
    blockedUrls: blockedUrls.length > 0 ? blockedUrls : undefined,
  };
}

/**
 * Crawl pages by following internal links
 */
export async function crawlByLinks(
  startUrl: string,
  options: Partial<CrawlOptions> = {}
): Promise<CrawlResult> {
  const opts = { ...DEFAULT_CRAWL_OPTIONS, ...options };
  const startTime = Date.now();
  const pages: PageAnalysis[] = [];
  const errors: string[] = [];
  const blockedUrls: string[] = [];
  const visited = new Set<string>();
  const queue: string[] = [startUrl];
  const baseUrl = new URL(startUrl).origin;
  const robotsEvaluator = opts.respectRobots
    ? await buildRobotsEvaluator(baseUrl, opts.userAgent, opts.timeout)
    : null;

  while (queue.length > 0 && pages.length < opts.maxPages) {
    const url = queue.shift()!;

    // Normalize URL for deduplication
    const normalizedUrl = url.replace(/\/$/, '');
    if (visited.has(normalizedUrl)) continue;
    visited.add(normalizedUrl);

    try {
      if (robotsEvaluator) {
        const evaluation = robotsEvaluator(url);
        if (!evaluation.allowed) {
          blockedUrls.push(url);
          continue;
        }
      }
      const analysis = await analyzePage(url, opts);
      pages.push(analysis);

      // Add internal links to queue
      if (opts.followLinks) {
        for (const link of analysis.internalLinks) {
          const normalizedLink = link.replace(/\/$/, '');
          if (!visited.has(normalizedLink)) {
            queue.push(link);
          }
        }
      }
    } catch (error) {
      errors.push(`Failed to analyze ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    pagesAnalyzed: pages,
    totalPages: pages.length,
    duration: Date.now() - startTime,
    errors,
    blockedUrls: blockedUrls.length > 0 ? blockedUrls : undefined,
  };
}

/**
 * Generate summary checks from crawl results
 */
export function generateCrawlSummaryChecks(result: CrawlResult): CheckResult[] {
  const checks: CheckResult[] = [];

  const normalizedPages = result.pagesAnalyzed.map((page) => ({
    url: page.url,
    normalized: normalizeUrl(page.url),
  }));
  const pageLookup = new Map<string, string>();
  for (const page of normalizedPages) {
    pageLookup.set(page.normalized, page.url);
  }

  const inboundCounts = new Map<string, number>();
  for (const page of normalizedPages) {
    inboundCounts.set(page.normalized, 0);
  }

  for (const page of result.pagesAnalyzed) {
    for (const link of page.internalLinks) {
      const normalizedLink = normalizeUrl(link);
      if (inboundCounts.has(normalizedLink)) {
        inboundCounts.set(normalizedLink, (inboundCounts.get(normalizedLink) ?? 0) + 1);
      }
    }
  }

  const homepageNormalized = normalizedPages.find((page) => {
    try {
      return new URL(page.url).pathname === '/';
    } catch {
      return false;
    }
  })?.normalized;

  const orphanPages = [...inboundCounts.entries()]
    .filter(([normalized, count]) => count === 0 && normalized !== homepageNormalized)
    .map(([normalized]) => pageLookup.get(normalized))
    .filter((url): url is string => Boolean(url));

  const contentHashes = new Map<string, string[]>();
  for (const page of result.pagesAnalyzed) {
    if (!page.contentHash) continue;
    const list = contentHashes.get(page.contentHash) ?? [];
    list.push(page.url);
    contentHashes.set(page.contentHash, list);
  }
  const duplicateGroups = [...contentHashes.values()].filter((group) => group.length > 1);

  // Check for pages with issues
  const pagesWithThinContent = result.pagesAnalyzed.filter(p =>
    p.issues.some(i => i.id === 'THIN_CONTENT')
  );
  const pagesWithNoH1 = result.pagesAnalyzed.filter(p =>
    p.issues.some(i => i.id === 'NO_H1')
  );
  const pagesWithMissingAlt = result.pagesAnalyzed.filter(p =>
    p.issues.some(i => i.id === 'IMAGE_MISSING_ALT')
  );
  const pagesWithNoCanonical = result.pagesAnalyzed.filter(p => !p.metadata.canonical);
  const pagesWithNoDescription = result.pagesAnalyzed.filter(p => !p.metadata.description);

  // Summary check for crawl
  checks.push({
    name: 'Pages Crawled',
    status: 'PASSED',
    severity: 'HIGH',
    message: `${result.totalPages} pages analyzed`,
    details: {
      totalPages: result.totalPages,
      duration: result.duration,
      errors: result.errors.length,
    },
  });

  // Thin content
  if (pagesWithThinContent.length > 0) {
    checks.push({
      name: 'Thin Content',
      status: 'WARNING',
      severity: 'MEDIUM',
      message: `${pagesWithThinContent.length} page(s) have thin content (<300 words)`,
      details: { urls: pagesWithThinContent.map(p => p.url) },
    });
  }

  // Missing H1
  if (pagesWithNoH1.length > 0) {
    checks.push({
      name: 'H1 Headings',
      status: 'WARNING',
      severity: 'HIGH',
      message: `${pagesWithNoH1.length} page(s) missing H1 heading`,
      details: { urls: pagesWithNoH1.map(p => p.url) },
    });
  }

  // Missing alt text
  if (pagesWithMissingAlt.length > 0) {
    checks.push({
      name: 'Image Alt Text',
      status: 'WARNING',
      severity: 'MEDIUM',
      message: `${pagesWithMissingAlt.length} page(s) have images without alt text`,
      details: { urls: pagesWithMissingAlt.map(p => p.url) },
    });
  }

  // Missing canonical
  if (pagesWithNoCanonical.length > 0) {
    checks.push({
      name: 'Canonical Tags (All Pages)',
      status: 'FAILED',
      severity: 'CRITICAL',
      message: `${pagesWithNoCanonical.length} page(s) missing canonical tag`,
      details: { urls: pagesWithNoCanonical.map(p => p.url) },
    });
  }

  // Missing description
  if (pagesWithNoDescription.length > 0) {
    checks.push({
      name: 'Meta Descriptions (All Pages)',
      status: 'WARNING',
      severity: 'HIGH',
      message: `${pagesWithNoDescription.length} page(s) missing meta description`,
      details: { urls: pagesWithNoDescription.map(p => p.url) },
    });
  }

  if (orphanPages.length > 0) {
    checks.push({
      name: 'Orphan Pages',
      status: 'WARNING',
      severity: 'MEDIUM',
      message: `${orphanPages.length} page(s) have no internal links pointing to them`,
      details: { urls: orphanPages.slice(0, 10) },
    });
  } else if (result.pagesAnalyzed.length > 1) {
    checks.push({
      name: 'Orphan Pages',
      status: 'PASSED',
      severity: 'LOW',
      message: 'All crawled pages have at least one internal link',
    });
  }

  if (duplicateGroups.length > 0) {
    const samples = duplicateGroups.slice(0, 3).map((group) => group.slice(0, 3));
    checks.push({
      name: 'Duplicate Content',
      status: 'WARNING',
      severity: 'MEDIUM',
      message: `${duplicateGroups.length} duplicate content group(s) detected`,
      details: { samples },
    });
  }

  if (result.blockedUrls && result.blockedUrls.length > 0) {
    checks.push({
      name: 'Robots.txt Blocks (Crawl)',
      status: 'WARNING',
      severity: 'MEDIUM',
      message: `${result.blockedUrls.length} URL(s) skipped due to robots.txt`,
      details: { urls: result.blockedUrls.slice(0, 10) },
    });
  }

  // Crawl errors
  if (result.errors.length > 0) {
    checks.push({
      name: 'Crawl Errors',
      status: 'WARNING',
      severity: 'HIGH',
      message: `${result.errors.length} page(s) failed to load`,
      details: { errors: result.errors },
    });
  }

  return checks;
}

export { DEFAULT_CRAWL_OPTIONS };
