// lib/types.ts - SEOBlogBot Type Definitions
// Version: 1.1.0

// ============================================================================
// Core Result Types
// ============================================================================

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type Status = 'PASSED' | 'FAILED' | 'WARNING' | 'SKIPPED';

export interface CheckResult {
  name: string;
  status: Status;
  severity: Severity;
  message?: string;
  fix?: string;
  details?: Record<string, unknown>;
}

export interface GateResult {
  gate: string;
  status: Status;
  checks: CheckResult[];
  duration: number;
}

export interface PreflightReport {
  url: string;
  timestamp: string;
  duration: number;
  passed: boolean;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    skipped: number;
  };
  gates: GateResult[];
  criticalIssues: CheckResult[];
  recommendations: string[];
  pagesCrawled?: number;
}

// ============================================================================
// SEO Issue Patterns
// ============================================================================

export type IssueCategory =
  | 'sitemap'
  | 'crawlability'
  | 'indexability'
  | 'meta'
  | 'schema'
  | 'canonical'
  | 'performance'
  | 'internal-linking';

export interface IssuePattern {
  id: string;
  category: IssueCategory;
  severity: Severity;
  message: string;
  fix: string;
  documentation?: string;
}

// ============================================================================
// Page Analysis Types
// ============================================================================

export interface PageMetadata {
  url: string;
  title?: string;
  titleLength?: number;
  description?: string;
  descriptionLength?: number;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: string;
  robots?: string;
  xRobotsTag?: string;
}

export interface PageAnalysis {
  url: string;
  statusCode: number;
  headers: Record<string, string>;
  metadata: PageMetadata;
  schemas: SchemaValidation[];
  wordCount: number;
  headingStructure: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  internalLinks: string[];
  externalLinks: string[];
  images: {
    total: number;
    withAlt: number;
    withoutAlt: string[];
  };
  issues: IssuePattern[];
  loadTime?: number;
}

export interface SchemaValidation {
  type: string;
  hasContext: boolean;
  requiredFields: string[];
  missingFields: string[];
  isValid: boolean;
  errors: string[];
  raw: unknown;
}

// ============================================================================
// Sitemap Types
// ============================================================================

export interface SitemapEntry {
  url: string;
  lastModified?: string;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export interface SitemapAnalysis {
  accessible: boolean;
  statusCode: number;
  contentType: string;
  isValidXml: boolean;
  urlCount: number;
  entries: SitemapEntry[];
  hasLastmod: boolean;
  issues: CheckResult[];
}

// ============================================================================
// Core Web Vitals Types
// ============================================================================

export interface CoreWebVitals {
  lcp?: number;   // Largest Contentful Paint (ms)
  fcp?: number;   // First Contentful Paint (ms)
  inp?: number;   // Interaction to Next Paint (ms)
  cls?: number;   // Cumulative Layout Shift (score)
  ttfb?: number;  // Time to First Byte (ms)
}

export interface PerformanceGrade {
  metric: keyof CoreWebVitals;
  value: number;
  threshold: { good: number; poor: number };
  grade: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';
}

export const CWV_THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 },
  fcp: { good: 1800, poor: 3000 },
  inp: { good: 200, poor: 500 },
  cls: { good: 0.1, poor: 0.25 },
  ttfb: { good: 800, poor: 1800 },
};

// ============================================================================
// Google Search Console Types
// ============================================================================

export interface GSCIndexingStatus {
  url: string;
  indexingState: 'INDEXED' | 'DISCOVERED' | 'CRAWLED_NOT_INDEXED' | 'EXCLUDED' | 'UNKNOWN';
  lastCrawlTime?: string;
  crawledAs?: 'DESKTOP' | 'MOBILE';
  robotsTxtState?: 'ALLOWED' | 'BLOCKED';
  indexingStatus?: string;
}

export interface GSCSearchAnalytics {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface SEOBlogBotConfig {
  baseUrl: string;
  sitemapUrl?: string;
  robotsUrl?: string;
  gscSiteUrl?: string;
  maxPagesToCheck?: number;
  timeout?: number;
  userAgent?: string;
  thresholds: {
    minWordCount: number;
    minTitleLength: number;
    maxTitleLength: number;
    minDescriptionLength: number;
    maxDescriptionLength: number;
    lcpThreshold: number;
    clsThreshold: number;
    inpThreshold: number;
  };
  gates: {
    sitemap: boolean;
    crawlability: boolean;
    indexability: boolean;
    metadata: boolean;
    schema: boolean;
    canonical: boolean;
    performance: boolean;
  };
}

export const DEFAULT_CONFIG: SEOBlogBotConfig = {
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
    performance: false, // Requires additional setup
  },
};

// ============================================================================
// Crawler Types
// ============================================================================

export interface CrawlOptions {
  maxPages: number;
  timeout: number;
  userAgent: string;
  followLinks: boolean;
  respectRobots: boolean;
  includeExternalLinks: boolean;
}

export interface CrawlResult {
  pagesAnalyzed: PageAnalysis[];
  totalPages: number;
  duration: number;
  errors: string[];
}
