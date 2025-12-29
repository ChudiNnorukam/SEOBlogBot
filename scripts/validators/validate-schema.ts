// scripts/validators/validate-schema.ts
// JSON-LD Schema validation module

import type { CheckResult, SchemaValidation } from '../../lib/types';

export interface SchemaValidatorOptions {
  html: string;
  url: string;
  isArticlePage?: boolean;
}

// Required fields for different schema types
const SCHEMA_REQUIREMENTS: Record<string, { required: string[]; recommended: string[] }> = {
  Article: {
    required: ['headline', '@type', '@context'],
    recommended: ['image', 'datePublished', 'author', 'publisher'],
  },
  BlogPosting: {
    required: ['headline', '@type', '@context'],
    recommended: ['image', 'datePublished', 'author', 'publisher', 'mainEntityOfPage'],
  },
  NewsArticle: {
    required: ['headline', '@type', '@context', 'datePublished'],
    recommended: ['image', 'author', 'publisher'],
  },
  Organization: {
    required: ['name', '@type', '@context'],
    recommended: ['logo', 'url', 'sameAs'],
  },
  Person: {
    required: ['name', '@type', '@context'],
    recommended: ['url', 'image', 'sameAs', 'jobTitle'],
  },
  WebSite: {
    required: ['name', '@type', '@context', 'url'],
    recommended: ['potentialAction'],
  },
  WebPage: {
    required: ['@type', '@context'],
    recommended: ['name', 'description', 'url'],
  },
  BreadcrumbList: {
    required: ['@type', '@context', 'itemListElement'],
    recommended: [],
  },
  FAQPage: {
    required: ['@type', '@context', 'mainEntity'],
    recommended: [],
  },
  HowTo: {
    required: ['@type', '@context', 'name', 'step'],
    recommended: ['description', 'image', 'totalTime'],
  },
};

/**
 * Validate JSON-LD structured data from HTML
 */
export function validateSchema(options: SchemaValidatorOptions): {
  checks: CheckResult[];
  schemas: SchemaValidation[];
} {
  const { html, url, isArticlePage = false } = options;
  const checks: CheckResult[] = [];
  const schemas: SchemaValidation[] = [];

  // Find all JSON-LD scripts
  const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  const jsonLdBlocks: string[] = [];

  for (const match of jsonLdMatches) {
    jsonLdBlocks.push(match[1]);
  }

  if (jsonLdBlocks.length === 0) {
    checks.push({
      name: 'JSON-LD Presence',
      status: 'WARNING',
      severity: 'MEDIUM',
      message: 'No JSON-LD structured data found',
      fix: 'Add JSON-LD schemas for Organization, WebSite, and articles',
    });
    return { checks, schemas };
  }

  checks.push({
    name: 'JSON-LD Presence',
    status: 'PASSED',
    severity: 'MEDIUM',
    message: `${jsonLdBlocks.length} schema(s) found`,
  });

  // Parse and validate each schema
  let validSchemas = 0;
  let invalidSchemas = 0;

  for (let i = 0; i < jsonLdBlocks.length; i++) {
    const block = jsonLdBlocks[i];
    const schemaValidation: SchemaValidation = {
      type: 'Unknown',
      hasContext: false,
      requiredFields: [],
      missingFields: [],
      isValid: false,
      errors: [],
      raw: null,
    };

    try {
      const parsed = JSON.parse(block);
      schemaValidation.raw = parsed;

      // Handle @graph structure
      const schemaItems = parsed['@graph'] || [parsed];

      for (const item of Array.isArray(schemaItems) ? schemaItems : [schemaItems]) {
        const type = item['@type'];
        schemaValidation.type = Array.isArray(type) ? type[0] : type || 'Unknown';

        // Check @context
        const context = item['@context'] || parsed['@context'];
        schemaValidation.hasContext = context === 'https://schema.org' ||
                                      context === 'http://schema.org' ||
                                      context?.includes?.('schema.org');

        if (!schemaValidation.hasContext) {
          schemaValidation.errors.push('Missing or invalid @context');
        }

        // Check @type
        if (!type) {
          schemaValidation.errors.push('Missing @type');
        }

        // Validate required fields for known types
        const requirements = SCHEMA_REQUIREMENTS[schemaValidation.type];
        if (requirements) {
          schemaValidation.requiredFields = requirements.required;
          for (const field of requirements.required) {
            if (field !== '@type' && field !== '@context' && !item[field]) {
              schemaValidation.missingFields.push(field);
            }
          }
        }

        // Additional checks for specific types
        if (schemaValidation.type === 'Article' || schemaValidation.type === 'BlogPosting') {
          // Check for proper author structure
          if (item.author && typeof item.author !== 'object') {
            schemaValidation.errors.push('Author should be an object with @type and name');
          }
          // Check for proper image
          if (!item.image) {
            schemaValidation.errors.push('Articles should have an image property');
          }
        }
      }

      schemaValidation.isValid = schemaValidation.errors.length === 0 &&
                                  schemaValidation.missingFields.length === 0;

      if (schemaValidation.isValid) {
        validSchemas++;
      } else {
        invalidSchemas++;
      }

    } catch (error) {
      schemaValidation.errors.push(`JSON parse error: ${error instanceof Error ? error.message : 'Unknown'}`);
      invalidSchemas++;
    }

    schemas.push(schemaValidation);
  }

  // Report JSON parse errors
  const parseErrors = schemas.filter(s => s.errors.some(e => e.includes('JSON parse error')));
  if (parseErrors.length > 0) {
    checks.push({
      name: 'JSON-LD Parse',
      status: 'FAILED',
      severity: 'HIGH',
      message: `${parseErrors.length} schema(s) have invalid JSON`,
      fix: 'Check for unescaped quotes, trailing commas, or other JSON syntax errors',
    });
  }

  // Report @context issues
  const contextIssues = schemas.filter(s => !s.hasContext && !s.errors.some(e => e.includes('JSON parse')));
  if (contextIssues.length > 0) {
    checks.push({
      name: 'Schema @context',
      status: 'FAILED',
      severity: 'HIGH',
      message: `${contextIssues.length} schema(s) missing @context`,
      fix: 'Add "@context": "https://schema.org"',
    });
  } else if (schemas.some(s => s.hasContext)) {
    checks.push({
      name: 'Schema @context',
      status: 'PASSED',
      severity: 'HIGH',
    });
  }

  // Check for recommended schema types
  const types = schemas.map(s => s.type);

  // Check for Organization/WebSite on homepage
  if (url.replace(/\/$/, '').split('/').length <= 3) { // Likely homepage
    if (!types.includes('Organization') && !types.includes('WebSite')) {
      checks.push({
        name: 'Homepage Schemas',
        status: 'WARNING',
        severity: 'LOW',
        message: 'Consider adding Organization and WebSite schemas to homepage',
      });
    }
  }

  // Check for Article schema on article pages
  if (isArticlePage) {
    const hasArticleSchema = types.includes('Article') ||
                            types.includes('BlogPosting') ||
                            types.includes('NewsArticle');
    if (!hasArticleSchema) {
      checks.push({
        name: 'Article Schema',
        status: 'WARNING',
        severity: 'MEDIUM',
        message: 'Article pages should have Article/BlogPosting schema',
        fix: 'Add BlogPosting JSON-LD to blog posts',
      });
    } else {
      checks.push({
        name: 'Article Schema',
        status: 'PASSED',
        severity: 'MEDIUM',
        message: 'Article schema present',
      });
    }
  }

  // Report missing required fields
  const missingFieldsSchemas = schemas.filter(s => s.missingFields.length > 0);
  if (missingFieldsSchemas.length > 0) {
    const allMissing = [...new Set(missingFieldsSchemas.flatMap(s => s.missingFields))];
    checks.push({
      name: 'Schema Required Fields',
      status: 'WARNING',
      severity: 'MEDIUM',
      message: `Missing recommended fields: ${allMissing.join(', ')}`,
      fix: 'Add missing fields for richer search results',
    });
  }

  // Overall validity summary
  if (invalidSchemas > 0) {
    checks.push({
      name: 'Schema Validity',
      status: 'WARNING',
      severity: 'MEDIUM',
      message: `${validSchemas} valid, ${invalidSchemas} with issues`,
    });
  } else {
    checks.push({
      name: 'Schema Validity',
      status: 'PASSED',
      severity: 'MEDIUM',
      message: `${validSchemas} valid schema(s)`,
    });
  }

  return { checks, schemas };
}

/**
 * Fetch a page and validate its JSON-LD schemas
 */
export async function validatePageSchema(options: {
  url: string;
  userAgent?: string;
  timeout?: number;
  isArticlePage?: boolean;
}): Promise<{
  checks: CheckResult[];
  schemas: SchemaValidation[];
}> {
  const { url, userAgent = 'SEOBlogBot/1.1', timeout = 10000, isArticlePage } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(url, {
    headers: { 'User-Agent': userAgent },
    signal: controller.signal,
  });

  clearTimeout(timeoutId);
  const html = await response.text();

  return validateSchema({ html, url, isArticlePage });
}

export type { SchemaValidatorOptions };
