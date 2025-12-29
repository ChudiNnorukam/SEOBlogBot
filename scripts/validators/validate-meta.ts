// scripts/validators/validate-meta.ts
// Meta tag validation module

import type { CheckResult, PageMetadata } from '../../lib/types';

export interface MetaValidatorOptions {
  html: string;
  url: string;
  thresholds?: {
    minTitleLength?: number;
    maxTitleLength?: number;
    minDescriptionLength?: number;
    maxDescriptionLength?: number;
  };
}

const DEFAULT_THRESHOLDS = {
  minTitleLength: 30,
  maxTitleLength: 60,
  minDescriptionLength: 120,
  maxDescriptionLength: 160,
};

/**
 * Extract and validate meta tags from HTML
 */
export function validateMeta(options: MetaValidatorOptions): {
  checks: CheckResult[];
  metadata: PageMetadata;
} {
  const { html, url, thresholds = DEFAULT_THRESHOLDS } = options;
  const checks: CheckResult[] = [];

  const metadata: PageMetadata = { url };

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    metadata.title = titleMatch[1].trim();
    metadata.titleLength = metadata.title.length;
  }

  // Extract meta description
  const descMatch =
    html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  if (descMatch) {
    metadata.description = descMatch[1].trim();
    metadata.descriptionLength = metadata.description.length;
  }

  // Extract canonical
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  if (canonicalMatch) {
    metadata.canonical = canonicalMatch[1].trim();
  }

  // Extract OpenGraph tags
  const ogTitleMatch = html.match(/property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (ogTitleMatch) metadata.ogTitle = ogTitleMatch[1].trim();

  const ogDescMatch = html.match(/property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
  if (ogDescMatch) metadata.ogDescription = ogDescMatch[1].trim();

  const ogImageMatch = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  if (ogImageMatch) metadata.ogImage = ogImageMatch[1].trim();

  // Extract Twitter Card
  const twitterCardMatch = html.match(/name=["']twitter:card["'][^>]*content=["']([^"']+)["']/i);
  if (twitterCardMatch) metadata.twitterCard = twitterCardMatch[1].trim();

  // Extract robots meta
  const robotsMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)["']/i);
  if (robotsMatch) metadata.robots = robotsMatch[1].trim();

  // Validation checks

  // 1. Title tag
  if (!metadata.title) {
    checks.push({
      name: 'Title Tag',
      status: 'FAILED',
      severity: 'CRITICAL',
      message: 'No <title> tag found',
      fix: 'Add title to metadata in layout.tsx',
    });
  } else {
    checks.push({
      name: 'Title Tag',
      status: 'PASSED',
      severity: 'CRITICAL',
      message: `"${metadata.title.substring(0, 50)}${metadata.title.length > 50 ? '...' : ''}"`,
      details: { title: metadata.title, length: metadata.titleLength },
    });

    // Title length check
    const { minTitleLength, maxTitleLength } = { ...DEFAULT_THRESHOLDS, ...thresholds };
    if (metadata.titleLength! < minTitleLength) {
      checks.push({
        name: 'Title Length',
        status: 'WARNING',
        severity: 'MEDIUM',
        message: `Title is ${metadata.titleLength} chars (recommended: ${minTitleLength}-${maxTitleLength})`,
        fix: 'Expand title to improve CTR',
      });
    } else if (metadata.titleLength! > maxTitleLength) {
      checks.push({
        name: 'Title Length',
        status: 'WARNING',
        severity: 'MEDIUM',
        message: `Title is ${metadata.titleLength} chars (recommended: ${minTitleLength}-${maxTitleLength})`,
        fix: 'Shorten title to avoid truncation in SERPs',
      });
    } else {
      checks.push({
        name: 'Title Length',
        status: 'PASSED',
        severity: 'MEDIUM',
        message: `${metadata.titleLength} characters (good)`,
      });
    }
  }

  // 2. Meta description
  if (!metadata.description) {
    checks.push({
      name: 'Meta Description',
      status: 'FAILED',
      severity: 'CRITICAL',
      message: 'No meta description found',
      fix: 'Add description to metadata in layout.tsx',
    });
  } else {
    checks.push({
      name: 'Meta Description',
      status: 'PASSED',
      severity: 'CRITICAL',
      message: `${metadata.descriptionLength} characters`,
      details: { description: metadata.description, length: metadata.descriptionLength },
    });

    // Description length check
    const { minDescriptionLength, maxDescriptionLength } = { ...DEFAULT_THRESHOLDS, ...thresholds };
    if (metadata.descriptionLength! < minDescriptionLength) {
      checks.push({
        name: 'Description Length',
        status: 'WARNING',
        severity: 'MEDIUM',
        message: `Description is ${metadata.descriptionLength} chars (recommended: ${minDescriptionLength}-${maxDescriptionLength})`,
      });
    } else if (metadata.descriptionLength! > maxDescriptionLength) {
      checks.push({
        name: 'Description Length',
        status: 'WARNING',
        severity: 'LOW',
        message: `Description is ${metadata.descriptionLength} chars (recommended: ${minDescriptionLength}-${maxDescriptionLength})`,
      });
    }
  }

  // 3. OpenGraph tags
  const missingOg: string[] = [];
  if (!metadata.ogTitle) missingOg.push('og:title');
  if (!metadata.ogDescription) missingOg.push('og:description');
  if (!metadata.ogImage) missingOg.push('og:image');

  if (missingOg.length > 0) {
    checks.push({
      name: 'OpenGraph Tags',
      status: 'WARNING',
      severity: 'MEDIUM',
      message: `Missing: ${missingOg.join(', ')}`,
      fix: 'Add openGraph to metadata in layout.tsx',
    });
  } else {
    checks.push({
      name: 'OpenGraph Tags',
      status: 'PASSED',
      severity: 'MEDIUM',
      message: 'All essential OG tags present',
    });
  }

  // 4. Twitter card
  if (!metadata.twitterCard) {
    checks.push({
      name: 'Twitter Card',
      status: 'WARNING',
      severity: 'LOW',
      message: 'No twitter:card meta tag',
      fix: 'Add twitter to metadata in layout.tsx',
    });
  } else {
    checks.push({
      name: 'Twitter Card',
      status: 'PASSED',
      severity: 'LOW',
      message: metadata.twitterCard,
    });
  }

  // 5. Viewport
  const hasViewport = /<meta[^>]*name=["']viewport["']/i.test(html);
  if (!hasViewport) {
    checks.push({
      name: 'Viewport Meta',
      status: 'FAILED',
      severity: 'CRITICAL',
      message: 'No viewport meta tag (mobile unfriendly)',
      fix: 'Next.js adds this automatically - check for issues',
    });
  } else {
    checks.push({
      name: 'Viewport Meta',
      status: 'PASSED',
      severity: 'CRITICAL',
    });
  }

  // 6. Robots meta noindex check
  if (metadata.robots?.toLowerCase().includes('noindex')) {
    checks.push({
      name: 'Meta Robots',
      status: 'FAILED',
      severity: 'CRITICAL',
      message: `Meta robots contains noindex: "${metadata.robots}"`,
      fix: 'Remove noindex or set robots.index = true in metadata',
    });
  }

  // 7. H1 heading check
  const h1Matches = html.match(/<h1[^>]*>([^<]*)<\/h1>/gi) || [];
  if (h1Matches.length === 0) {
    checks.push({
      name: 'H1 Heading',
      status: 'WARNING',
      severity: 'HIGH',
      message: 'No H1 heading found on page',
      fix: 'Add a single H1 heading describing the page content',
    });
  } else if (h1Matches.length > 1) {
    checks.push({
      name: 'H1 Heading',
      status: 'WARNING',
      severity: 'MEDIUM',
      message: `Multiple H1 headings found (${h1Matches.length})`,
      fix: 'Use only one H1 per page',
    });
  } else {
    checks.push({
      name: 'H1 Heading',
      status: 'PASSED',
      severity: 'HIGH',
      message: 'Single H1 heading present',
    });
  }

  return { checks, metadata };
}

/**
 * Fetch a page and validate its meta tags
 */
export async function validatePageMeta(options: {
  url: string;
  userAgent?: string;
  timeout?: number;
  thresholds?: MetaValidatorOptions['thresholds'];
}): Promise<{
  checks: CheckResult[];
  metadata: PageMetadata;
}> {
  const { url, userAgent = 'SEOBlogBot/1.1', timeout = 10000, thresholds } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(url, {
    headers: { 'User-Agent': userAgent },
    signal: controller.signal,
  });

  clearTimeout(timeoutId);
  const html = await response.text();

  return validateMeta({ html, url, thresholds });
}

export type { MetaValidatorOptions };
