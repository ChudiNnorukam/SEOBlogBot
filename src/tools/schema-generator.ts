// JSON-LD Schema Generator Tool

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as cheerio from 'cheerio';
import { fetchUrl } from '../services/http-client.js';
import type { SchemaRecommendation, RecommendedSchema, ExistingSchema } from '../types/index.js';

type PageType = 'article' | 'blog_post' | 'product' | 'faq' | 'how_to' | 'local_business' | 'person' | 'organization';

const SCHEMA_TEMPLATES: Record<PageType, RecommendedSchema[]> = {
  article: [
    {
      type: 'Article',
      priority: 'required',
      template: JSON.stringify(
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: '{{title}}',
          description: '{{description}}',
          image: '{{image}}',
          datePublished: '{{publishDate}}',
          dateModified: '{{modifiedDate}}',
          author: {
            '@type': 'Person',
            name: '{{authorName}}',
            url: '{{authorUrl}}',
          },
          publisher: {
            '@type': 'Organization',
            name: '{{publisherName}}',
            logo: {
              '@type': 'ImageObject',
              url: '{{logoUrl}}',
            },
          },
        },
        null,
        2
      ),
    },
    {
      type: 'BreadcrumbList',
      priority: 'recommended',
      template: JSON.stringify(
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: '{{homeUrl}}' },
            { '@type': 'ListItem', position: 2, name: '{{categoryName}}', item: '{{categoryUrl}}' },
            { '@type': 'ListItem', position: 3, name: '{{title}}' },
          ],
        },
        null,
        2
      ),
    },
  ],
  blog_post: [
    {
      type: 'BlogPosting',
      priority: 'required',
      template: JSON.stringify(
        {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: '{{title}}',
          description: '{{description}}',
          image: '{{image}}',
          datePublished: '{{publishDate}}',
          dateModified: '{{modifiedDate}}',
          author: {
            '@type': 'Person',
            name: '{{authorName}}',
            url: '{{authorUrl}}',
          },
          publisher: {
            '@type': 'Organization',
            name: '{{publisherName}}',
            logo: { '@type': 'ImageObject', url: '{{logoUrl}}' },
          },
          mainEntityOfPage: { '@type': 'WebPage', '@id': '{{pageUrl}}' },
        },
        null,
        2
      ),
    },
  ],
  product: [
    {
      type: 'Product',
      priority: 'required',
      template: JSON.stringify(
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: '{{productName}}',
          description: '{{description}}',
          image: '{{image}}',
          brand: { '@type': 'Brand', name: '{{brandName}}' },
          offers: {
            '@type': 'Offer',
            price: '{{price}}',
            priceCurrency: '{{currency}}',
            availability: 'https://schema.org/InStock',
          },
        },
        null,
        2
      ),
    },
  ],
  faq: [
    {
      type: 'FAQPage',
      priority: 'required',
      template: JSON.stringify(
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: '{{question1}}',
              acceptedAnswer: { '@type': 'Answer', text: '{{answer1}}' },
            },
          ],
        },
        null,
        2
      ),
    },
  ],
  how_to: [
    {
      type: 'HowTo',
      priority: 'required',
      template: JSON.stringify(
        {
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: '{{title}}',
          description: '{{description}}',
          step: [
            { '@type': 'HowToStep', text: '{{step1}}' },
            { '@type': 'HowToStep', text: '{{step2}}' },
          ],
        },
        null,
        2
      ),
    },
  ],
  local_business: [
    {
      type: 'LocalBusiness',
      priority: 'required',
      template: JSON.stringify(
        {
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: '{{businessName}}',
          description: '{{description}}',
          address: {
            '@type': 'PostalAddress',
            streetAddress: '{{street}}',
            addressLocality: '{{city}}',
            addressRegion: '{{state}}',
            postalCode: '{{zip}}',
            addressCountry: '{{country}}',
          },
          telephone: '{{phone}}',
          openingHours: '{{hours}}',
        },
        null,
        2
      ),
    },
  ],
  person: [
    {
      type: 'Person',
      priority: 'required',
      template: JSON.stringify(
        {
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: '{{name}}',
          jobTitle: '{{jobTitle}}',
          description: '{{bio}}',
          url: '{{profileUrl}}',
          sameAs: ['{{linkedIn}}', '{{twitter}}', '{{github}}'],
          worksFor: { '@type': 'Organization', name: '{{company}}' },
        },
        null,
        2
      ),
    },
  ],
  organization: [
    {
      type: 'Organization',
      priority: 'required',
      template: JSON.stringify(
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: '{{orgName}}',
          description: '{{description}}',
          url: '{{websiteUrl}}',
          logo: '{{logoUrl}}',
          sameAs: ['{{linkedIn}}', '{{twitter}}', '{{facebook}}'],
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: '{{phone}}',
            contactType: 'customer service',
          },
        },
        null,
        2
      ),
    },
  ],
};

export function registerSchemaGeneratorTool(server: McpServer): void {
  server.registerTool(
    'generate-schema-recommendation',
    {
      title: 'Generate Schema Recommendation',
      description:
        'Analyze a page and recommend JSON-LD structured data schemas. Checks existing schemas and suggests improvements for rich results.',
      inputSchema: {
        url: z.string().url().describe('URL to analyze'),
        pageType: z
          .enum(['article', 'blog_post', 'product', 'faq', 'how_to', 'local_business', 'person', 'organization'])
          .optional()
          .describe('Page type hint (if not provided, will attempt to auto-detect)'),
      },
      outputSchema: {
        url: z.string(),
        detectedType: z.string(),
        recommendedSchemas: z.array(
          z.object({
            type: z.string(),
            priority: z.enum(['required', 'recommended', 'optional']),
            template: z.string(),
          })
        ),
        existingSchemas: z.array(
          z.object({
            type: z.string(),
            valid: z.boolean(),
            issues: z.array(z.string()),
          })
        ),
      },
    },
    async ({ url, pageType }) => {
      const result = await generateSchemaRecommendation(url, pageType);

      // Build summary
      let summary = `Schema Recommendation for ${url}\n`;
      summary += `${'='.repeat(50)}\n\n`;
      summary += `Detected Page Type: ${result.detectedType}\n\n`;

      if (result.existingSchemas.length > 0) {
        summary += 'Existing Schemas:\n';
        for (const schema of result.existingSchemas) {
          const status = schema.valid ? '✅' : '❌';
          summary += `  ${status} ${schema.type}`;
          if (schema.issues.length > 0) {
            summary += ` - Issues: ${schema.issues.join(', ')}`;
          }
          summary += '\n';
        }
        summary += '\n';
      } else {
        summary += 'No existing schemas found.\n\n';
      }

      summary += 'Recommended Schemas:\n';
      for (const schema of result.recommendedSchemas) {
        const priority = schema.priority === 'required' ? '🔴' : schema.priority === 'recommended' ? '🟡' : '🟢';
        summary += `  ${priority} ${schema.type} (${schema.priority})\n`;
      }

      return {
        content: [
          { type: 'text', text: summary },
          { type: 'text', text: JSON.stringify(result, null, 2) },
        ],
        structuredContent: result,
      };
    }
  );
}

async function generateSchemaRecommendation(
  url: string,
  pageType?: PageType
): Promise<SchemaRecommendation> {
  let detectedType: PageType = pageType ?? 'article';
  const existingSchemas: ExistingSchema[] = [];

  try {
    const response = await fetchUrl(url);
    const $ = cheerio.load(response.body);

    // Extract existing JSON-LD schemas
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        const content = $(element).html();
        if (content) {
          const parsed = JSON.parse(content) as { '@type'?: string };
          const schemaType = parsed['@type'] ?? 'Unknown';
          existingSchemas.push({
            type: schemaType,
            valid: true,
            issues: validateSchema(parsed),
          });
        }
      } catch {
        existingSchemas.push({
          type: 'Invalid JSON',
          valid: false,
          issues: ['Failed to parse JSON-LD'],
        });
      }
    });

    // Auto-detect page type if not provided
    if (!pageType) {
      detectedType = detectPageType($, url);
    }
  } catch (error) {
    // If we can't fetch the page, use the provided type or default
    detectedType = pageType ?? 'article';
  }

  const recommendedSchemas = SCHEMA_TEMPLATES[detectedType] ?? SCHEMA_TEMPLATES['article'];

  return {
    url,
    detectedType,
    recommendedSchemas,
    existingSchemas,
  };
}

function detectPageType($: cheerio.CheerioAPI, url: string): PageType {
  const urlLower = url.toLowerCase();
  const title = $('title').text().toLowerCase();
  const h1 = $('h1').first().text().toLowerCase();
  const combined = `${urlLower} ${title} ${h1}`;

  // Check URL and title patterns
  if (combined.includes('/blog/') || combined.includes('/post/') || combined.includes('blog post')) {
    return 'blog_post';
  }
  if (urlLower.includes('/product/') || urlLower.includes('/shop/')) {
    return 'product';
  }
  if (urlLower.includes('/faq') || urlLower.includes('/frequently-asked')) {
    return 'faq';
  }
  if (urlLower.includes('/how-to') || urlLower.includes('/guide/') || urlLower.includes('/tutorial/')) {
    return 'how_to';
  }
  if (urlLower.includes('/about') || urlLower.includes('/team/')) {
    // Check if it's about a person or organization
    if ($('article').length > 0 || h1.includes('about me')) {
      return 'person';
    }
    return 'organization';
  }

  // Check content patterns
  if ($('article').length > 0) {
    // Check for date indicators suggesting a blog post
    if ($('time').length > 0 || $('[class*="date"]').length > 0) {
      return 'blog_post';
    }
    return 'article';
  }

  // Check for FAQ patterns
  const hasQuestionAnswerPairs =
    $('dt').length > 2 ||
    $('[class*="faq"]').length > 0 ||
    $('[class*="question"]').length > 2;
  if (hasQuestionAnswerPairs) {
    return 'faq';
  }

  // Default to article
  return 'article';
}

function validateSchema(schema: Record<string, unknown>): string[] {
  const issues: string[] = [];

  if (!schema['@context']) {
    issues.push('Missing @context');
  }

  if (!schema['@type']) {
    issues.push('Missing @type');
  }

  // Type-specific validation
  const schemaType = schema['@type'];

  if (schemaType === 'Article' || schemaType === 'BlogPosting') {
    if (!schema['headline']) issues.push('Missing headline');
    if (!schema['author']) issues.push('Missing author');
    if (!schema['datePublished']) issues.push('Missing datePublished');
  }

  if (schemaType === 'Product') {
    if (!schema['name']) issues.push('Missing name');
    if (!schema['offers']) issues.push('Missing offers (price information)');
  }

  return issues;
}
