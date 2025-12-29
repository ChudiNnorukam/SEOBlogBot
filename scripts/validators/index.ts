// scripts/validators/index.ts
// Export all validators

export { validateSitemap } from './validate-sitemap';
export type { SitemapValidatorOptions } from './validate-sitemap';

export { validateCrawlability } from './validate-crawlability';
export type { CrawlabilityValidatorOptions, RobotsAnalysis } from './validate-crawlability';

export { validateMeta, validatePageMeta } from './validate-meta';
export type { MetaValidatorOptions } from './validate-meta';

export { validateCanonical, validatePageCanonical } from './validate-canonical';
export type { CanonicalValidatorOptions, CanonicalAnalysis } from './validate-canonical';

export { validateSchema, validatePageSchema } from './validate-schema';
export type { SchemaValidatorOptions } from './validate-schema';

export { validatePerformance, getPageSpeedInsights } from './validate-performance';
export type { PerformanceValidatorOptions, PerformanceAnalysis } from './validate-performance';
