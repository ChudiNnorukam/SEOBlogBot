// Meta Tags Validator Tool

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as cheerio from 'cheerio';
import { fetchUrl } from '../services/http-client.js';
import type { MetaTagsResult, MetaField, OpenGraphData, TwitterData } from '../types/index.js';

// SEO best practice lengths
const TITLE_MIN = 30;
const TITLE_MAX = 60;
const DESC_MIN = 120;
const DESC_MAX = 160;
const HREFLANG_PATTERN = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/;

export function registerValidateMetaTagsTool(server: McpServer): void {
  server.registerTool(
    'validate-meta-tags',
    {
      title: 'Validate Meta Tags',
      description:
        'Check title, description, Open Graph, Twitter cards, canonical URL, and X-Robots-Tag header. Identifies SEO issues that affect indexing and social sharing.',
      inputSchema: {
        url: z.string().url().describe('URL to validate'),
      },
      outputSchema: {
        url: z.string(),
        title: z.object({
          value: z.string().nullable(),
          length: z.number(),
          status: z.enum(['good', 'too_short', 'too_long', 'missing']),
        }),
        description: z.object({
          value: z.string().nullable(),
          length: z.number(),
          status: z.enum(['good', 'too_short', 'too_long', 'missing']),
        }),
        openGraph: z.object({
          title: z.string().nullable(),
          description: z.string().nullable(),
          image: z.string().nullable(),
          type: z.string().nullable(),
          url: z.string().nullable(),
        }),
        twitter: z.object({
          card: z.string().nullable(),
          title: z.string().nullable(),
          description: z.string().nullable(),
          image: z.string().nullable(),
        }),
        canonical: z.string().nullable(),
        xRobotsTag: z.string().nullable(),
        issues: z.array(z.string()),
      },
    },
    async ({ url }) => {
      const result = await validateMetaTags(url);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    }
  );
}

async function validateMetaTags(url: string): Promise<MetaTagsResult> {
  const issues: string[] = [];

  let response;
  try {
    response = await fetchUrl(url);
  } catch (error) {
    return {
      url,
      title: { value: null, length: 0, status: 'missing' },
      description: { value: null, length: 0, status: 'missing' },
      openGraph: { title: null, description: null, image: null, type: null, url: null },
      twitter: { card: null, title: null, description: null, image: null },
      canonical: null,
      xRobotsTag: null,
      issues: [`Failed to fetch URL: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }

  // Check X-Robots-Tag header
  const xRobotsTag = response.headers['x-robots-tag'] ?? null;
  if (xRobotsTag) {
    if (xRobotsTag.toLowerCase().includes('noindex')) {
      issues.push(
        `X-Robots-Tag header contains "noindex" - this page will NOT be indexed by search engines!`
      );
    }
    if (xRobotsTag.toLowerCase().includes('nofollow')) {
      issues.push(`X-Robots-Tag header contains "nofollow" - links on this page won't pass PageRank.`);
    }
  }

  const $ = cheerio.load(response.body);

  // Extract title
  const titleText = $('title').text().trim();
  const title = extractMetaField(titleText, TITLE_MIN, TITLE_MAX);
  if (title.status === 'missing') {
    issues.push('Missing <title> tag - critical for SEO');
  } else if (title.status === 'too_short') {
    issues.push(`Title too short (${title.length} chars). Aim for ${TITLE_MIN}-${TITLE_MAX} characters.`);
  } else if (title.status === 'too_long') {
    issues.push(`Title too long (${title.length} chars). Will be truncated in search results. Max ${TITLE_MAX} chars.`);
  }

  // Extract description
  const descText = $('meta[name="description"]').attr('content')?.trim() ?? null;
  const description = extractMetaField(descText, DESC_MIN, DESC_MAX);
  if (description.status === 'missing') {
    issues.push('Missing meta description - important for click-through rates');
  } else if (description.status === 'too_short') {
    issues.push(`Description too short (${description.length} chars). Aim for ${DESC_MIN}-${DESC_MAX} characters.`);
  } else if (description.status === 'too_long') {
    issues.push(`Description too long (${description.length} chars). Will be truncated. Max ${DESC_MAX} chars.`);
  }

  // Extract Open Graph
  const openGraph: OpenGraphData = {
    title: $('meta[property="og:title"]').attr('content')?.trim() ?? null,
    description: $('meta[property="og:description"]').attr('content')?.trim() ?? null,
    image: $('meta[property="og:image"]').attr('content')?.trim() ?? null,
    type: $('meta[property="og:type"]').attr('content')?.trim() ?? null,
    url: $('meta[property="og:url"]').attr('content')?.trim() ?? null,
  };

  if (!openGraph.title) {
    issues.push('Missing og:title - affects social media sharing');
  }
  if (!openGraph.description) {
    issues.push('Missing og:description - affects social media sharing');
  }
  if (!openGraph.image) {
    issues.push('Missing og:image - social shares will lack visual appeal');
  }

  // Extract Twitter
  const twitter: TwitterData = {
    card: $('meta[name="twitter:card"]').attr('content')?.trim() ?? null,
    title: $('meta[name="twitter:title"]').attr('content')?.trim() ?? null,
    description: $('meta[name="twitter:description"]').attr('content')?.trim() ?? null,
    image: $('meta[name="twitter:image"]').attr('content')?.trim() ?? null,
  };

  if (!twitter.card) {
    issues.push('Missing twitter:card - Twitter shares may not display properly');
  }

  // Extract canonical
  const canonical = $('link[rel="canonical"]').attr('href')?.trim() ?? null;
  if (!canonical) {
    issues.push('Missing canonical URL - may cause duplicate content issues');
  } else {
    // Validate canonical is absolute URL
    try {
      new URL(canonical);
    } catch {
      issues.push(`Canonical URL is not absolute: "${canonical}". Must be a full URL.`);
    }
  }

  // Check for robots meta tag
  const robotsMeta = $('meta[name="robots"]').attr('content')?.trim();
  if (robotsMeta) {
    if (robotsMeta.toLowerCase().includes('noindex')) {
      issues.push('Meta robots tag contains "noindex" - page will NOT be indexed!');
    }
    if (robotsMeta.toLowerCase().includes('nofollow')) {
      issues.push('Meta robots tag contains "nofollow" - links may not pass PageRank.');
    }
  }

  // Check viewport for mobile
  const viewport = $('meta[name="viewport"]').attr('content');
  if (!viewport) {
    issues.push('Missing viewport meta tag - page may not be mobile-friendly');
  }

  // Check hreflang tags
  const hreflangLinks = $('link[rel~="alternate"][hreflang]').toArray();
  if (hreflangLinks.length > 0) {
    let missingHrefCount = 0;
    let invalidLangCount = 0;
    let nonAbsoluteCount = 0;
    let duplicateCount = 0;
    const seen = new Map<string, Set<string>>();
    const hasXDefault = hreflangLinks.some((el) =>
      ($(el).attr('hreflang') ?? '').toLowerCase() === 'x-default'
    );

    for (const el of hreflangLinks) {
      const hreflang = $(el).attr('hreflang')?.trim() ?? '';
      const href = $(el).attr('href')?.trim() ?? '';

      if (hreflang && hreflang.toLowerCase() !== 'x-default' && !HREFLANG_PATTERN.test(hreflang)) {
        invalidLangCount += 1;
      }

      if (!href) {
        missingHrefCount += 1;
      } else if (!/^https?:\/\//i.test(href)) {
        nonAbsoluteCount += 1;
      }

      if (!seen.has(hreflang)) {
        seen.set(hreflang, new Set());
      }
      if (href) {
        const bucket = seen.get(hreflang)!;
        if (bucket.size > 0 && !bucket.has(href)) {
          duplicateCount += 1;
        }
        bucket.add(href);
      }
    }

    if (missingHrefCount > 0) {
      issues.push(`${missingHrefCount} hreflang links are missing href`);
    }
    if (nonAbsoluteCount > 0) {
      issues.push(`${nonAbsoluteCount} hreflang links use non-absolute URLs`);
    }
    if (invalidLangCount > 0) {
      issues.push(`${invalidLangCount} hreflang values are invalid`);
    }
    if (duplicateCount > 0) {
      issues.push(`${duplicateCount} duplicate hreflang entries found`);
    }
    if (hreflangLinks.length > 1 && !hasXDefault) {
      issues.push('Missing x-default hreflang for internationalized pages');
    }
  }

  return {
    url,
    title,
    description,
    openGraph,
    twitter,
    canonical,
    xRobotsTag,
    issues,
  };
}

function extractMetaField(
  value: string | null,
  minLength: number,
  maxLength: number
): MetaField {
  if (!value) {
    return { value: null, length: 0, status: 'missing' };
  }

  const length = value.length;
  let status: MetaField['status'];

  if (length < minLength) {
    status = 'too_short';
  } else if (length > maxLength) {
    status = 'too_long';
  } else {
    status = 'good';
  }

  return { value, length, status };
}
