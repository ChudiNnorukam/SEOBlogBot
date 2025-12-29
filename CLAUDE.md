# CURRENT MODE: ARCHITECT

# SEOBlogBot - Claude Code Project Context

## What This Is

SEOBlogBot is a Claude Code CLI skill for automated SEO auditing, fixing, and monitoring of Vercel-hosted Next.js blogs. It uses the same gate-based validation architecture as MicroSaaSBot v3.

## Quick Commands

```bash
# Full SEO audit
npm run seo:audit https://chudi-blog.vercel.app

# Fix specific issues
npm run seo:fix sitemap
npm run seo:fix metadata
npm run seo:fix schema

# Check specific gates
npm run seo:sitemap
npm run seo:crawl
npm run seo:meta
npm run seo:canonical
npm run seo:schema
```

## Gate Architecture

| Gate | Script | What It Checks |
|------|--------|----------------|
| 1. Sitemap | validate-sitemap.ts | Accessibility, XML validity, URL count |
| 2. Crawlability | validate-crawlability.ts | robots.txt, X-Robots-Tag, AI crawlers |
| 3. Meta Tags | validate-meta.ts | title, description, OG, Twitter |
| 4. Canonical | validate-canonical.ts | Presence, absolute URLs, self-reference |
| 5. Schema | validate-schema.ts | JSON-LD validity, required types |
| 6. CWV | validate-cwv.ts | LCP, INP, CLS |

## Critical Patterns

### Sitemap Must Have:
```typescript
export const dynamic = 'force-dynamic';
export const revalidate = 0;
```

### Robots Must Allow AI Crawlers:
```typescript
{ userAgent: 'GPTBot', allow: '/' },
{ userAgent: 'ClaudeBot', allow: '/' },
{ userAgent: 'PerplexityBot', allow: '/' },
```

### Preview Deployments Must Have noindex:
```javascript
// next.config.js
...(process.env.VERCEL_ENV !== 'production' ? [{
  source: '/:path*',
  headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
}] : []),
```

## Common Issues & Fixes

| Issue | Root Cause | Fix |
|-------|------------|-----|
| "Couldn't fetch" sitemap | Caching/middleware | Add `dynamic = 'force-dynamic'` |
| Only 1 page indexed | noindex headers | Check X-Robots-Tag in prod |
| No AI visibility | robots.txt blocking | Add GPTBot/ClaudeBot Allow rules |
| Duplicate content | Missing canonicals | Add `alternates.canonical` to metadata |

## File Locations

| Purpose | Location |
|---------|----------|
| Sitemap | `app/sitemap.ts` |
| Robots | `app/robots.ts` |
| Root Metadata | `app/layout.tsx` |
| Page Metadata | `app/[page]/page.tsx` → `generateMetadata()` |
| JSON-LD | Component with `<script type="application/ld+json">` |

## Dependencies

```bash
npm install --save-dev lighthouse puppeteer
```

## Testing Commands

```bash
# Verify sitemap
curl -I https://chudi-blog.vercel.app/sitemap.xml
curl https://chudi-blog.vercel.app/sitemap.xml | head -20

# Verify robots
curl https://chudi-blog.vercel.app/robots.txt

# Check for noindex headers
curl -I https://chudi-blog.vercel.app | grep -i x-robots

# Test as AI crawler
curl -A "GPTBot" https://chudi-blog.vercel.app/
```

## GSC API Setup (for monitoring)

1. Create project in Google Cloud Console
2. Enable Search Console API
3. Create service account with Search Console access
4. Download JSON key
5. Set `GOOGLE_APPLICATION_CREDENTIALS` env var

## Success Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| Sitemap Status | "Success" in GSC | 1-3 days |
| Pages Indexed | All blog posts | 2-4 weeks |
| Schema Errors | 0 | Immediate |
| CWV | All green | 1-2 weeks |
