# /seo fix - Auto-Fix SEO Issues

## Overview

The `/seo fix` command automatically fixes common SEO issues by generating correct configurations and code.

## Usage

```bash
# Fix all auto-fixable issues
claude "/seo fix all"

# Fix specific category
claude "/seo fix sitemap"
claude "/seo fix metadata"
claude "/seo fix schema"
claude "/seo fix robots"
claude "/seo fix canonical"
```

## Fix Categories

### 1. Sitemap (`/seo fix sitemap`)

**Fixes:**
- SITEMAP_500 - Server error on sitemap
- SITEMAP_404 - Missing sitemap
- SITEMAP_EMPTY - Sitemap with no URLs
- SITEMAP_NO_LASTMOD - Missing lastmod tags

**Actions:**
1. Creates/updates `app/sitemap.ts` with:
   - `export const dynamic = 'force-dynamic'`
   - `export const revalidate = 0`
   - Proper data fetching from your CMS/database
   - All static and dynamic page URLs
   - lastModified dates for freshness signals

**Template:** See `templates/app-sitemap.ts`

### 2. Metadata (`/seo fix metadata`)

**Fixes:**
- TITLE_MISSING - No title tag
- DESCRIPTION_MISSING - No meta description
- OG_MISSING - Missing OpenGraph tags
- TWITTER_CARD_MISSING - Missing Twitter Card

**Actions:**
1. Updates `app/layout.tsx` with complete metadata:
   ```typescript
   export const metadata: Metadata = {
     metadataBase: new URL('https://your-site.com'),
     title: {
       default: 'Your Site Title',
       template: '%s | Your Site',
     },
     description: 'Your site description (120-160 chars)',
     openGraph: {
       title: 'Your Site Title',
       description: 'Your site description',
       url: 'https://your-site.com',
       siteName: 'Your Site',
       images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
       locale: 'en_US',
       type: 'website',
     },
     twitter: {
       card: 'summary_large_image',
       title: 'Your Site Title',
       description: 'Your site description',
       images: ['/og-image.jpg'],
     },
   };
   ```

**Template:** See `templates/layout-metadata.tsx`

### 3. Schema (`/seo fix schema`)

**Fixes:**
- JSONLD_MISSING - No structured data
- JSONLD_INVALID - Invalid JSON-LD
- JSONLD_NO_CONTEXT - Missing @context
- JSONLD_ARTICLE_MISSING_FIELDS - Incomplete article schema

**Actions:**
1. Creates JSON-LD component for layout (Organization, WebSite)
2. Creates JSON-LD component for blog posts (BlogPosting/Article)
3. Validates JSON structure

**Generated Schemas:**
- Organization schema for homepage
- WebSite schema with search action
- BlogPosting schema for articles with:
  - headline, description, image
  - datePublished, dateModified
  - author with Person schema
  - publisher with Organization schema

### 4. Robots (`/seo fix robots`)

**Fixes:**
- ROBOTS_MISSING - No robots.txt
- ROBOTS_BLANKET_BLOCK - Blocking all crawlers
- ROBOTS_NO_SITEMAP - Missing sitemap directive
- ROBOTS_AI_BLOCKED - AI crawlers blocked

**Actions:**
1. Creates/updates `app/robots.ts` with:
   - Allow rules for main content
   - Disallow rules for /api/, /admin/, /_next/
   - Explicit rules for AI crawlers (GPTBot, ClaudeBot, etc.)
   - Sitemap directive

**Template:** See `templates/app-robots.ts`

### 5. Canonical (`/seo fix canonical`)

**Fixes:**
- CANONICAL_MISSING - No canonical tag
- CANONICAL_RELATIVE - Relative canonical URL
- CANONICAL_HTTP - HTTP instead of HTTPS

**Actions:**
1. Adds `metadataBase` to layout.tsx
2. Adds `alternates.canonical` to metadata
3. Ensures absolute HTTPS URLs

**Example:**
```typescript
export const metadata: Metadata = {
  metadataBase: new URL('https://your-site.com'),
  alternates: {
    canonical: '/',
  },
};

// For dynamic pages
export async function generateMetadata({ params }): Promise<Metadata> {
  return {
    alternates: {
      canonical: `/blog/${params.slug}`,
    },
  };
}
```

## Workflow

1. **Run audit first:**
   ```bash
   claude "/seo audit https://your-site.com"
   ```

2. **Review issues and fix:**
   ```bash
   # Fix specific issues
   claude "/seo fix sitemap"

   # Or fix all at once
   claude "/seo fix all"
   ```

3. **Verify fixes:**
   ```bash
   npx ts-node ~/.claude/skills/seo-blog-bot/scripts/seo-preflight.ts https://your-site.com
   ```

4. **Deploy and resubmit to GSC:**
   ```bash
   # After deployment
   claude "/seo monitor submit-sitemap"
   ```

## Safety

- All fixes are non-destructive - existing files are backed up
- Generated code follows Next.js best practices
- Comments explain what each section does
- Easy to customize after generation

## Limitations

- Cannot fix server-side performance issues
- Cannot fix external service integrations
- Cannot fix content quality (thin content)
- Some fixes require manual customization (e.g., adding real content)
