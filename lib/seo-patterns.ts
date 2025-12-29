// lib/seo-patterns.ts - SEO Issue Pattern Library
// Version: 1.1.0

import type { IssuePattern, Severity } from './types';

// ============================================================================
// Pattern Definitions
// ============================================================================

export const SEO_PATTERNS: Record<string, IssuePattern> = {
  // Sitemap Issues
  SITEMAP_500: {
    id: 'SITEMAP_500',
    category: 'sitemap',
    severity: 'CRITICAL',
    message: 'Sitemap returns server error (5xx)',
    fix: 'Add `export const dynamic = "force-dynamic"` to app/sitemap.ts',
    documentation: 'gates/crawlability-gate.md',
  },
  SITEMAP_404: {
    id: 'SITEMAP_404',
    category: 'sitemap',
    severity: 'CRITICAL',
    message: 'Sitemap not found (404)',
    fix: 'Create app/sitemap.ts using the template',
    documentation: 'templates/app-sitemap.ts',
  },
  SITEMAP_EMPTY: {
    id: 'SITEMAP_EMPTY',
    category: 'sitemap',
    severity: 'CRITICAL',
    message: 'Sitemap contains no URLs',
    fix: 'Ensure sitemap.ts fetches and returns all blog posts',
    documentation: 'commands/fix-sitemap.md',
  },
  SITEMAP_INVALID_XML: {
    id: 'SITEMAP_INVALID_XML',
    category: 'sitemap',
    severity: 'CRITICAL',
    message: 'Sitemap is not valid XML',
    fix: 'Check for middleware blocking or error pages',
    documentation: 'gates/crawlability-gate.md',
  },
  SITEMAP_NO_LASTMOD: {
    id: 'SITEMAP_NO_LASTMOD',
    category: 'sitemap',
    severity: 'MEDIUM',
    message: 'Sitemap missing lastmod dates',
    fix: 'Add lastModified to sitemap entries for freshness signals',
    documentation: 'templates/app-sitemap.ts',
  },
  SITEMAP_WRONG_CONTENT_TYPE: {
    id: 'SITEMAP_WRONG_CONTENT_TYPE',
    category: 'sitemap',
    severity: 'HIGH',
    message: 'Sitemap has wrong Content-Type (expected XML)',
    fix: 'Ensure sitemap.ts returns MetadataRoute.Sitemap type',
    documentation: 'templates/app-sitemap.ts',
  },

  // Crawlability Issues
  ROBOTS_BLANKET_BLOCK: {
    id: 'ROBOTS_BLANKET_BLOCK',
    category: 'crawlability',
    severity: 'CRITICAL',
    message: 'Robots.txt blocks all crawlers with Disallow: /',
    fix: 'Change to allow specific paths: Disallow: /api/',
    documentation: 'templates/app-robots.ts',
  },
  ROBOTS_MISSING: {
    id: 'ROBOTS_MISSING',
    category: 'crawlability',
    severity: 'MEDIUM',
    message: 'No robots.txt file found',
    fix: 'Create app/robots.ts using the template',
    documentation: 'templates/app-robots.ts',
  },
  ROBOTS_NO_SITEMAP: {
    id: 'ROBOTS_NO_SITEMAP',
    category: 'crawlability',
    severity: 'MEDIUM',
    message: 'Robots.txt missing Sitemap directive',
    fix: 'Add Sitemap: https://yoursite.com/sitemap.xml',
    documentation: 'templates/app-robots.ts',
  },
  ROBOTS_AI_BLOCKED: {
    id: 'ROBOTS_AI_BLOCKED',
    category: 'crawlability',
    severity: 'LOW',
    message: 'AI crawlers blocked in robots.txt',
    fix: 'Consider allowing AI crawlers for AEO visibility',
    documentation: 'templates/app-robots.ts',
  },

  // Indexability Issues
  NOINDEX_HEADER: {
    id: 'NOINDEX_HEADER',
    category: 'indexability',
    severity: 'CRITICAL',
    message: 'X-Robots-Tag header contains noindex',
    fix: 'Check VERCEL_ENV in next.config.js headers or Vercel settings',
    documentation: 'gates/indexability-gate.md',
  },
  NOINDEX_META: {
    id: 'NOINDEX_META',
    category: 'indexability',
    severity: 'CRITICAL',
    message: 'Meta robots tag contains noindex',
    fix: 'Set robots.index = true in metadata or remove noindex',
    documentation: 'gates/indexability-gate.md',
  },
  NOFOLLOW_META: {
    id: 'NOFOLLOW_META',
    category: 'indexability',
    severity: 'HIGH',
    message: 'Meta robots tag contains nofollow',
    fix: 'Remove nofollow unless intentionally blocking link equity',
    documentation: 'gates/indexability-gate.md',
  },

  // Canonical Issues
  CANONICAL_MISSING: {
    id: 'CANONICAL_MISSING',
    category: 'canonical',
    severity: 'CRITICAL',
    message: 'No canonical URL defined',
    fix: 'Add alternates.canonical to metadata configuration',
    documentation: 'gates/canonical-gate.md',
  },
  CANONICAL_RELATIVE: {
    id: 'CANONICAL_RELATIVE',
    category: 'canonical',
    severity: 'HIGH',
    message: 'Canonical URL is relative, not absolute',
    fix: 'Use metadataBase in layout.tsx for absolute URLs',
    documentation: 'gates/canonical-gate.md',
  },
  CANONICAL_HTTP: {
    id: 'CANONICAL_HTTP',
    category: 'canonical',
    severity: 'HIGH',
    message: 'Canonical URL uses HTTP instead of HTTPS',
    fix: 'Update metadataBase to use https://',
    documentation: 'gates/canonical-gate.md',
  },
  CANONICAL_MISMATCH: {
    id: 'CANONICAL_MISMATCH',
    category: 'canonical',
    severity: 'HIGH',
    message: 'Canonical URL does not match page URL',
    fix: 'Verify canonical points to correct URL or is intentional',
    documentation: 'gates/canonical-gate.md',
  },

  // Meta Tag Issues
  TITLE_MISSING: {
    id: 'TITLE_MISSING',
    category: 'meta',
    severity: 'CRITICAL',
    message: 'No <title> tag found',
    fix: 'Add title to metadata configuration in layout.tsx',
    documentation: 'patterns/metadata-app-router.md',
  },
  TITLE_TOO_SHORT: {
    id: 'TITLE_TOO_SHORT',
    category: 'meta',
    severity: 'MEDIUM',
    message: 'Title is too short (< 30 characters)',
    fix: 'Expand title to 30-60 characters for better CTR',
    documentation: 'patterns/metadata-app-router.md',
  },
  TITLE_TOO_LONG: {
    id: 'TITLE_TOO_LONG',
    category: 'meta',
    severity: 'MEDIUM',
    message: 'Title is too long (> 60 characters)',
    fix: 'Shorten title to 30-60 characters to avoid truncation',
    documentation: 'patterns/metadata-app-router.md',
  },
  DESCRIPTION_MISSING: {
    id: 'DESCRIPTION_MISSING',
    category: 'meta',
    severity: 'HIGH',
    message: 'No meta description found',
    fix: 'Add description to metadata configuration',
    documentation: 'patterns/metadata-app-router.md',
  },
  DESCRIPTION_TOO_SHORT: {
    id: 'DESCRIPTION_TOO_SHORT',
    category: 'meta',
    severity: 'MEDIUM',
    message: 'Meta description is too short (< 120 characters)',
    fix: 'Expand description to 120-160 characters',
    documentation: 'patterns/metadata-app-router.md',
  },
  DESCRIPTION_TOO_LONG: {
    id: 'DESCRIPTION_TOO_LONG',
    category: 'meta',
    severity: 'LOW',
    message: 'Meta description is too long (> 160 characters)',
    fix: 'Shorten description to avoid truncation in SERPs',
    documentation: 'patterns/metadata-app-router.md',
  },
  OG_MISSING: {
    id: 'OG_MISSING',
    category: 'meta',
    severity: 'MEDIUM',
    message: 'Missing OpenGraph tags',
    fix: 'Add openGraph to metadata for better social sharing',
    documentation: 'patterns/metadata-app-router.md',
  },
  OG_IMAGE_MISSING: {
    id: 'OG_IMAGE_MISSING',
    category: 'meta',
    severity: 'MEDIUM',
    message: 'Missing og:image tag',
    fix: 'Add og:image for better social sharing preview',
    documentation: 'patterns/metadata-app-router.md',
  },
  TWITTER_CARD_MISSING: {
    id: 'TWITTER_CARD_MISSING',
    category: 'meta',
    severity: 'LOW',
    message: 'Missing Twitter Card meta tag',
    fix: 'Add twitter.card to metadata for Twitter/X sharing',
    documentation: 'patterns/metadata-app-router.md',
  },
  VIEWPORT_MISSING: {
    id: 'VIEWPORT_MISSING',
    category: 'meta',
    severity: 'CRITICAL',
    message: 'No viewport meta tag (mobile unfriendly)',
    fix: 'Next.js adds this automatically - check for issues',
    documentation: 'patterns/metadata-app-router.md',
  },

  // Schema/JSON-LD Issues
  JSONLD_MISSING: {
    id: 'JSONLD_MISSING',
    category: 'schema',
    severity: 'MEDIUM',
    message: 'No JSON-LD structured data found',
    fix: 'Add JSON-LD schemas for Organization and articles',
    documentation: 'gates/structured-data-gate.md',
  },
  JSONLD_INVALID: {
    id: 'JSONLD_INVALID',
    category: 'schema',
    severity: 'HIGH',
    message: 'JSON-LD contains invalid JSON',
    fix: 'Check for unescaped quotes or trailing commas',
    documentation: 'gates/structured-data-gate.md',
  },
  JSONLD_NO_CONTEXT: {
    id: 'JSONLD_NO_CONTEXT',
    category: 'schema',
    severity: 'HIGH',
    message: 'JSON-LD missing @context',
    fix: 'Add "@context": "https://schema.org"',
    documentation: 'gates/structured-data-gate.md',
  },
  JSONLD_NO_TYPE: {
    id: 'JSONLD_NO_TYPE',
    category: 'schema',
    severity: 'HIGH',
    message: 'JSON-LD missing @type',
    fix: 'Add "@type": "Article" or appropriate type',
    documentation: 'gates/structured-data-gate.md',
  },
  JSONLD_ARTICLE_MISSING_FIELDS: {
    id: 'JSONLD_ARTICLE_MISSING_FIELDS',
    category: 'schema',
    severity: 'MEDIUM',
    message: 'Article schema missing recommended fields',
    fix: 'Add headline, image, datePublished, author',
    documentation: 'gates/structured-data-gate.md',
  },

  // Performance Issues
  LCP_SLOW: {
    id: 'LCP_SLOW',
    category: 'performance',
    severity: 'MEDIUM',
    message: 'Largest Contentful Paint > 2.5s',
    fix: 'Optimize images, reduce blocking resources',
    documentation: 'gates/performance-gate.md',
  },
  CLS_HIGH: {
    id: 'CLS_HIGH',
    category: 'performance',
    severity: 'MEDIUM',
    message: 'Cumulative Layout Shift > 0.1',
    fix: 'Add width/height to images, reserve space for dynamic content',
    documentation: 'gates/performance-gate.md',
  },
  INP_SLOW: {
    id: 'INP_SLOW',
    category: 'performance',
    severity: 'MEDIUM',
    message: 'Interaction to Next Paint > 200ms',
    fix: 'Reduce JavaScript execution time, break up long tasks',
    documentation: 'gates/performance-gate.md',
  },
  TTFB_SLOW: {
    id: 'TTFB_SLOW',
    category: 'performance',
    severity: 'MEDIUM',
    message: 'Time to First Byte > 800ms',
    fix: 'Optimize server response time, use CDN',
    documentation: 'gates/performance-gate.md',
  },

  // Content/Internal Linking Issues
  THIN_CONTENT: {
    id: 'THIN_CONTENT',
    category: 'internal-linking',
    severity: 'MEDIUM',
    message: 'Page has thin content (< 300 words)',
    fix: 'Add more substantive content or consider noindex',
    documentation: 'gates/content-gate.md',
  },
  NO_H1: {
    id: 'NO_H1',
    category: 'meta',
    severity: 'HIGH',
    message: 'Page has no H1 heading',
    fix: 'Add a single H1 heading describing the page content',
    documentation: 'patterns/metadata-app-router.md',
  },
  MULTIPLE_H1: {
    id: 'MULTIPLE_H1',
    category: 'meta',
    severity: 'MEDIUM',
    message: 'Page has multiple H1 headings',
    fix: 'Use only one H1 per page, use H2+ for subheadings',
    documentation: 'patterns/metadata-app-router.md',
  },
  BROKEN_INTERNAL_LINK: {
    id: 'BROKEN_INTERNAL_LINK',
    category: 'internal-linking',
    severity: 'HIGH',
    message: 'Internal link returns 404',
    fix: 'Fix or remove the broken link',
    documentation: 'gates/internal-linking-gate.md',
  },
  IMAGE_MISSING_ALT: {
    id: 'IMAGE_MISSING_ALT',
    category: 'meta',
    severity: 'MEDIUM',
    message: 'Images missing alt text',
    fix: 'Add descriptive alt text to all images',
    documentation: 'patterns/metadata-app-router.md',
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get pattern by ID
 */
export function getPattern(id: string): IssuePattern | undefined {
  return SEO_PATTERNS[id];
}

/**
 * Get all patterns by category
 */
export function getPatternsByCategory(category: string): IssuePattern[] {
  return Object.values(SEO_PATTERNS).filter(p => p.category === category);
}

/**
 * Get all patterns by severity
 */
export function getPatternsBySeverity(severity: Severity): IssuePattern[] {
  return Object.values(SEO_PATTERNS).filter(p => p.severity === severity);
}

/**
 * Get critical patterns that should block deployment
 */
export function getCriticalPatterns(): IssuePattern[] {
  return getPatternsBySeverity('CRITICAL');
}

/**
 * Check if an issue should block deployment
 */
export function shouldBlock(patternId: string): boolean {
  const pattern = getPattern(patternId);
  return pattern?.severity === 'CRITICAL';
}
