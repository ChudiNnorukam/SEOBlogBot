// scripts/validators/index.ts
// Export all validators

export { validateSitemap } from './validate-sitemap';
export type { SitemapValidatorOptions } from './validate-sitemap';

export { validateSitemapConflicts } from './validate-sitemap-conflicts';

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

export { validateRendering } from './validate-rendering';
export type { RenderingValidatorOptions } from './validate-rendering';

export { validateLighthouse } from './validate-lighthouse';
export type { LighthouseValidatorOptions } from './validate-lighthouse';
