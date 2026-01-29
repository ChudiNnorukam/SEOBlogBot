// scripts/validators/validate-schema.ts
// JSON-LD Schema validation module

import type { CheckResult, SchemaValidation } from '../../lib/types';

export interface SchemaValidatorOptions {
  html: string;
  url: string;
  isArticlePage?: boolean;
  mobileHtml?: string;
}

// Required/recommended fields for supported schema types (Google rich results)
const SCHEMA_REQUIREMENTS: Record<string, { required: string[]; recommended: string[] }> = {
  Article: {
    required: [],
    recommended: ['headline', 'image', 'datePublished', 'dateModified', 'author'],
  },
  BlogPosting: {
    required: [],
    recommended: ['headline', 'image', 'datePublished', 'dateModified', 'author', 'publisher'],
  },
  NewsArticle: {
    required: [],
    recommended: ['headline', 'image', 'datePublished', 'dateModified', 'author', 'publisher'],
  },
  Organization: {
    required: [],
    recommended: ['name', 'url', 'logo', 'sameAs'],
  },
  BreadcrumbList: {
    required: ['itemListElement'],
    recommended: [],
  },
  FAQPage: {
    required: ['mainEntity'],
    recommended: [],
  },
  HowTo: {
    required: ['name', 'step'],
    recommended: ['description', 'image', 'totalTime'],
  },
};

const extractVisibleText = (html: string): string => {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/\s+/g, ' ').trim();
  return text.toLowerCase();
};

const normalizeSchemaItems = (parsed: unknown): unknown[] => {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    const graph = (parsed as { ['@graph']?: unknown })['@graph'];
    if (Array.isArray(graph)) return graph;
    if (graph) return [graph];
    return [parsed];
  }
  return [];
};

const validateBreadcrumbItems = (itemListElement: unknown): string[] => {
  const errors: string[] = [];
  if (!Array.isArray(itemListElement)) {
    errors.push('BreadcrumbList itemListElement should be an array');
    return errors;
  }
  if (itemListElement.length < 2) {
    errors.push('BreadcrumbList should contain at least two items');
  }
  for (const item of itemListElement) {
    if (!item || typeof item !== 'object') {
      errors.push('BreadcrumbList items must be ListItem objects');
      continue;
    }
    const listItem = item as Record<string, unknown>;
    if (!listItem.position) errors.push('BreadcrumbList ListItem missing position');
    if (!listItem.name) errors.push('BreadcrumbList ListItem missing name');
    if (!listItem.item) errors.push('BreadcrumbList ListItem missing item URL');
  }
  return errors;
};

/**
 * Validate JSON-LD structured data from HTML
 */
export function validateSchema(options: SchemaValidatorOptions): {
  checks: CheckResult[];
  schemas: SchemaValidation[];
} {
  const { html, url, isArticlePage = false, mobileHtml } = options;
  const checks: CheckResult[] = [];
  const schemas: SchemaValidation[] = [];
  const visibleText = extractVisibleText(html);

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
  const policyWarnings: string[] = [];

  for (let i = 0; i < jsonLdBlocks.length; i++) {
    const block = jsonLdBlocks[i];
    try {
      const parsed = JSON.parse(block);
      const schemaItems = normalizeSchemaItems(parsed);
      for (const item of schemaItems) {
        const schemaValidation: SchemaValidation = {
          type: 'Unknown',
          hasContext: false,
          requiredFields: [],
          missingFields: [],
          recommendedFields: [],
          missingRecommended: [],
          policyWarnings: [],
          isValid: false,
          errors: [],
          raw: item ?? null,
        };

        if (!item || typeof item !== 'object') {
          schemaValidation.errors.push('Schema item is not an object');
          schemas.push(schemaValidation);
          invalidSchemas++;
          continue;
        }

        const itemObj = item as Record<string, unknown>;
        const type = itemObj['@type'];
        schemaValidation.type = Array.isArray(type) ? (type[0] as string) : (type as string) || 'Unknown';

        // Check @context
        const context = itemObj['@context'] ?? (parsed as Record<string, unknown>)['@context'];
        schemaValidation.hasContext = context === 'https://schema.org' ||
                                      context === 'http://schema.org' ||
                                      (typeof context === 'string' && context.includes('schema.org'));

        if (!schemaValidation.hasContext) {
          schemaValidation.errors.push('Missing or invalid @context');
        }

        // Check @type
        if (!type) {
          schemaValidation.errors.push('Missing @type');
        }

        // Validate required/recommended fields for known types
        const requirements = SCHEMA_REQUIREMENTS[schemaValidation.type];
        if (requirements) {
          schemaValidation.requiredFields = requirements.required;
          schemaValidation.recommendedFields = requirements.recommended;
          for (const field of requirements.required) {
            if (!itemObj[field]) {
              schemaValidation.missingFields.push(field);
            }
          }
          for (const field of requirements.recommended) {
            if (!itemObj[field]) {
              schemaValidation.missingRecommended.push(field);
            }
          }
        }

        // Additional checks for specific types
        if (schemaValidation.type === 'Article' ||
            schemaValidation.type === 'BlogPosting' ||
            schemaValidation.type === 'NewsArticle') {
          const headline = itemObj.headline;
          if (headline && typeof headline === 'string' && !visibleText.includes(headline.toLowerCase())) {
            schemaValidation.policyWarnings?.push('Headline not found in visible content');
          }
          const author = itemObj.author as { name?: string } | undefined;
          if (author?.name && typeof author.name === 'string' &&
              !visibleText.includes(author.name.toLowerCase())) {
            schemaValidation.policyWarnings?.push('Author name not found in visible content');
          }
        }

        if (schemaValidation.type === 'Organization') {
          const name = itemObj.name;
          if (name && typeof name === 'string' && !visibleText.includes(name.toLowerCase())) {
            schemaValidation.policyWarnings?.push('Organization name not found in visible content');
          }
        }

        if (schemaValidation.type === 'BreadcrumbList') {
          const breadcrumbErrors = validateBreadcrumbItems(itemObj.itemListElement);
          schemaValidation.errors.push(...breadcrumbErrors);
          if (Array.isArray(itemObj.itemListElement)) {
            for (const entry of itemObj.itemListElement) {
              if (entry && typeof entry === 'object') {
                const name = (entry as Record<string, unknown>).name;
                if (typeof name === 'string' && !visibleText.includes(name.toLowerCase())) {
                  schemaValidation.policyWarnings?.push('Breadcrumb item not found in visible content');
                  break;
                }
              }
            }
          }
        }

        schemaValidation.isValid = schemaValidation.errors.length === 0 &&
                                    schemaValidation.missingFields.length === 0;

        if (schemaValidation.policyWarnings && schemaValidation.policyWarnings.length > 0) {
          policyWarnings.push(...schemaValidation.policyWarnings);
        }

        if (schemaValidation.isValid) {
          validSchemas++;
        } else {
          invalidSchemas++;
        }

        schemas.push(schemaValidation);
      }
    } catch (error) {
      schemas.push({
        type: 'Unknown',
        hasContext: false,
        requiredFields: [],
        missingFields: [],
        isValid: false,
        errors: [`JSON parse error: ${error instanceof Error ? error.message : 'Unknown'}`],
        raw: null,
      });
      invalidSchemas += 1;
    }
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
      message: `Missing required fields: ${allMissing.join(', ')}`,
      fix: 'Add missing fields for richer search results',
    });
  }

  const missingRecommendedSchemas = schemas.filter(s => (s.missingRecommended ?? []).length > 0);
  if (missingRecommendedSchemas.length > 0) {
    const allMissing = [
      ...new Set(missingRecommendedSchemas.flatMap(s => s.missingRecommended ?? [])),
    ];
    checks.push({
      name: 'Schema Recommended Fields',
      status: 'WARNING',
      severity: 'LOW',
      message: `Missing recommended fields: ${allMissing.join(', ')}`,
      fix: 'Add recommended fields to improve rich result eligibility',
    });
  }

  if (policyWarnings.length > 0) {
    checks.push({
      name: 'Structured Data Policy',
      status: 'WARNING',
      severity: 'MEDIUM',
      message: `Potential policy mismatches: ${[...new Set(policyWarnings)].slice(0, 5).join('; ')}`,
      fix: 'Ensure structured data reflects visible page content',
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

  // Mobile parity for schema types
  if (mobileHtml) {
    const mobileMatches = mobileHtml.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    const mobileBlocks: string[] = [];
    for (const match of mobileMatches) {
      mobileBlocks.push(match[1]);
    }
    const desktopTypes = schemas.map(s => s.type).filter(Boolean);
    const mobileTypes: string[] = [];

    for (const block of mobileBlocks) {
      try {
        const parsed = JSON.parse(block);
        const items = normalizeSchemaItems(parsed);
        for (const item of items) {
          if (item && typeof item === 'object') {
            const type = (item as Record<string, unknown>)['@type'];
            const typeValue = Array.isArray(type) ? type[0] : type;
            if (typeof typeValue === 'string') {
              mobileTypes.push(typeValue);
            }
          }
        }
      } catch {
        // Ignore mobile schema parse errors here; already handled in main validation
      }
    }

    const missingOnMobile = desktopTypes.filter((type) => !mobileTypes.includes(type));
    const extraOnMobile = mobileTypes.filter((type) => !desktopTypes.includes(type));
    if (missingOnMobile.length > 0 || extraOnMobile.length > 0) {
      checks.push({
        name: 'Mobile Schema Parity',
        status: 'WARNING',
        severity: 'MEDIUM',
        message: `Schema types differ between desktop and mobile`,
        details: {
          missingOnMobile: [...new Set(missingOnMobile)],
          extraOnMobile: [...new Set(extraOnMobile)],
        },
      });
    } else if (desktopTypes.length > 0) {
      checks.push({
        name: 'Mobile Schema Parity',
        status: 'PASSED',
        severity: 'LOW',
        message: 'Desktop and mobile schema types match',
      });
    }
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
