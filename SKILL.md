# SEOBlogBot - Claude Code CLI Skill

**Version:** 1.1.0
**Purpose:** Automated SEO/AEO auditing, fixing, and monitoring for Vercel-hosted Next.js blogs
**Target:** chudi-blog.vercel.app (adaptable to any Next.js blog)

## What's New in v1.1

- **Modular validators**: Each gate has its own TypeScript module for maintainability
- **Multi-page crawling**: Crawl all pages from sitemap, not just homepage
- **Performance gate**: TTFB, compression, caching validation (basic CWV)
- **Pattern library**: 30+ SEO issue patterns with auto-fix hints
- **GSC client stub**: Ready-to-use Google Search Console API integration
- **Competitor analysis**: Analyze competitor SEO setup
- **Installation verification**: Health check script to verify skill setup

---

## Architecture Overview

SEOBlogBot uses the same gate-based validation architecture as MicroSaaSBot v3, adapted for SEO concerns:

| MicroSaaSBot Gate | SEOBlogBot Equivalent | What It Validates |
|-------------------|----------------------|-------------------|
| RLS Validation | Schema.org Validation | JSON-LD structured data on all pages |
| Webhook Security | Sitemap Accessibility | Sitemap.xml fetchable, valid XML, all URLs included |
| IDOR Detection | Canonical URL Verification | No duplicate content, proper canonical tags |
| Subscription Enforcement | Meta Tag Completeness | Title, description, OG, Twitter cards |
| Storage Policies | Robots.txt + Crawlability | AI crawlers allowed, no accidental noindex |

---

## File Structure

```
~/.claude/skills/seo-blog-bot/
├── SKILL.md                          # This file
├── CLAUDE.md                         # Project context for Claude Code
├── ARCHITECTURE.md                   # Architecture mapping
├── gates/
│   ├── crawlability-gate.md          # Sitemap + robots validation
│   ├── indexability-gate.md          # noindex detection
│   ├── metadata-gate.md              # Meta tag validation
│   ├── canonical-gate.md             # Canonical URL criteria
│   └── structured-data-gate.md       # JSON-LD validation
├── scripts/
│   ├── seo-preflight.ts              # Main orchestrator (CLI entry point)
│   ├── verify-installation.ts        # Health check script
│   ├── validators/
│   │   ├── index.ts                  # Validator exports
│   │   ├── validate-sitemap.ts       # Sitemap validation
│   │   ├── validate-crawlability.ts  # Robots.txt + headers
│   │   ├── validate-meta.ts          # Meta tags
│   │   ├── validate-canonical.ts     # Canonical URLs
│   │   ├── validate-schema.ts        # JSON-LD validation
│   │   └── validate-performance.ts   # TTFB, caching (basic CWV)
│   └── crawlers/
│       └── page-crawler.ts           # Multi-page crawler
├── commands/
│   ├── audit.md                      # /seo audit workflow
│   ├── fix.md                        # /seo fix workflow
│   ├── fix-sitemap.md                # Sitemap fix guide
│   ├── fix-indexing.md               # Indexing fix guide
│   └── competitor.md                 # Competitor analysis
├── patterns/
│   └── metadata-app-router.md        # Next.js App Router metadata
├── templates/
│   ├── app-sitemap.ts                # Copy-paste sitemap
│   ├── app-robots.ts                 # Copy-paste robots.txt
│   ├── layout-metadata.tsx           # Root layout metadata
│   └── github-actions-seo.yml        # CI/CD workflow
└── lib/
    ├── types.ts                      # TypeScript definitions
    ├── seo-patterns.ts               # 30+ issue patterns
    └── gsc-client.ts                 # Google Search Console API stub
```

---

## Gates (8 Total)

### Gate 1: Sitemap Accessibility
**File:** `gates/sitemap-gate.md`
**Script:** `scripts/validate-sitemap.ts`

| Check | Criteria | Failure = |
|-------|----------|-----------|
| HTTP Status | 200 OK | 🛑 BLOCKED |
| Content-Type | application/xml or text/xml | 🛑 BLOCKED |
| Valid XML | Parses without errors | 🛑 BLOCKED |
| URL Count | > 0 URLs listed | 🛑 BLOCKED |
| All Pages Included | Blog posts in sitemap | ⚠️ WARNING |
| lastmod Present | Dates on all URLs | ⚠️ WARNING |
| No Blocked URLs | URLs not in robots.txt Disallow | 🛑 BLOCKED |

### Gate 2: Schema.org Validation
**File:** `gates/schema-gate.md`
**Script:** `scripts/validate-schema.ts`

| Check | Criteria | Failure = |
|-------|----------|-----------|
| JSON-LD Present | At least one script type="application/ld+json" | ⚠️ WARNING |
| Valid JSON | Parses without errors | 🛑 BLOCKED |
| @context Present | "https://schema.org" | 🛑 BLOCKED |
| @type Present | Valid schema type | 🛑 BLOCKED |
| Article Schema | Blog posts have BlogPosting/Article | ⚠️ WARNING |
| Author Schema | Author info on articles | ⚠️ WARNING |
| Organization Schema | Homepage has Organization | ⚠️ WARNING |

### Gate 3: Meta Tag Completeness
**File:** `gates/meta-gate.md`
**Script:** `scripts/validate-meta.ts`

| Check | Criteria | Failure = |
|-------|----------|-----------|
| Title Present | <title> exists | 🛑 BLOCKED |
| Title Length | 30-60 characters | ⚠️ WARNING |
| Description Present | meta name="description" | 🛑 BLOCKED |
| Description Length | 120-160 characters | ⚠️ WARNING |
| OG Title | og:title present | ⚠️ WARNING |
| OG Description | og:description present | ⚠️ WARNING |
| OG Image | og:image with dimensions | ⚠️ WARNING |
| Twitter Card | twitter:card present | ⚠️ WARNING |
| Viewport | Responsive viewport meta | 🛑 BLOCKED |

### Gate 4: Canonical URL Verification
**File:** `gates/canonical-gate.md`
**Script:** `scripts/validate-canonical.ts`

| Check | Criteria | Failure = |
|-------|----------|-----------|
| Canonical Present | link rel="canonical" on all pages | 🛑 BLOCKED |
| Absolute URL | Canonical is full URL, not relative | 🛑 BLOCKED |
| Self-Referencing | Canonical points to current URL | ⚠️ WARNING |
| No Duplicates | No two pages with same canonical | 🛑 BLOCKED |
| HTTPS | Canonical uses HTTPS | 🛑 BLOCKED |
| Trailing Slash Consistent | Matches site config | ⚠️ WARNING |

### Gate 5: Crawlability
**File:** `gates/crawlability-gate.md`
**Script:** `scripts/validate-crawlability.ts`

| Check | Criteria | Failure = |
|-------|----------|-----------|
| Robots.txt Accessible | 200 OK at /robots.txt | 🛑 BLOCKED |
| Sitemap Referenced | Sitemap: directive present | ⚠️ WARNING |
| No Blanket Disallow | Not blocking /* | 🛑 BLOCKED |
| AI Crawlers Allowed | GPTBot, ClaudeBot, PerplexityBot | ⚠️ WARNING |
| X-Robots-Tag | No noindex in production headers | 🛑 BLOCKED |
| Preview Env Protected | noindex on non-production | ⚠️ WARNING |

### Gate 6: Rendering Parity
**File:** `gates/rendering-gate.md`
**Script:** `scripts/validators/validate-rendering.ts`

| Check | Criteria | Failure = |
|-------|----------|-----------|
| Rendered vs HTML parity | Rendered content roughly matches HTML | ⚠️ WARNING |

### Gate 7: Lighthouse Checklist
**File:** `gates/lighthouse-gate.md`
**Script:** `scripts/validators/validate-lighthouse.ts`

| Check | Criteria | Failure = |
|-------|----------|-----------|
| Lighthouse Performance | Score >= 90 | ⚠️ WARNING |
| Lighthouse Accessibility | Score >= 90 | ⚠️ WARNING |
| Lighthouse Best Practices | Score >= 90 | ⚠️ WARNING |
| Lighthouse SEO | Score >= 90 | ⚠️ WARNING |
| Lighthouse PWA | Score >= 90 | ⚠️ WARNING |

### Gate 8: Core Web Vitals
**File:** `gates/cwv-gate.md`
**Script:** `scripts/validate-cwv.ts`

| Check | Criteria | Failure = |
|-------|----------|-----------|
| LCP | ≤ 2.5s | ⚠️ WARNING |
| INP | ≤ 200ms | ⚠️ WARNING |
| CLS | ≤ 0.1 | ⚠️ WARNING |
| Mobile Friendly | Passes mobile usability | ⚠️ WARNING |

---

## Commands

### /audit - Full SEO Audit
```bash
claude "/audit https://chudi-blog.vercel.app"
```

Runs all 8 gates and produces a report with:
- Pass/Fail status for each check
- Specific issues found
- Fix recommendations with code snippets
- Priority ranking (Critical → High → Medium → Low)

### /fix - Auto-Fix Issues
```bash
claude "/fix sitemap"      # Fix sitemap.ts
claude "/fix metadata"     # Fix metadata configuration
claude "/fix schema"       # Add JSON-LD schemas
claude "/fix robots"       # Fix robots.txt
claude "/fix all"          # Fix everything possible
```

### /monitor - Ongoing Monitoring
```bash
claude "/monitor setup"    # Configure GSC API integration
claude "/monitor check"    # Check indexing status
claude "/monitor report"   # Generate weekly report
```

### /competitor - Competitor Analysis
```bash
claude "/competitor analyze https://competitor.com"
claude "/competitor keywords"   # Keyword gap analysis
claude "/competitor content"    # Content gap analysis
```

---

## Integration with Build Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/seo-check.yml
name: SEO Validation
on: [pull_request]

jobs:
  seo-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - name: Build
        run: npm run build
      
      - name: Start Preview Server
        run: npm run start &
        
      - name: Wait for Server
        run: npx wait-on http://localhost:3000
      
      - name: SEO Preflight
        run: npx ts-node scripts/seo-preflight.ts http://localhost:3000
        
      - name: Upload Report
        uses: actions/upload-artifact@v4
        with:
          name: seo-report
          path: seo-report.json
```

### Package.json Scripts
```json
{
  "scripts": {
    "seo:audit": "ts-node scripts/seo-preflight.ts",
    "seo:sitemap": "ts-node scripts/validate-sitemap.ts",
    "seo:schema": "ts-node scripts/validate-schema.ts",
    "seo:meta": "ts-node scripts/validate-meta.ts",
    "seo:canonical": "ts-node scripts/validate-canonical.ts",
    "seo:crawl": "ts-node scripts/validate-crawlability.ts",
    "seo:fix": "ts-node scripts/fix-metadata.ts",
    "prebuild": "npm run seo:audit"
  }
}
```

---

## Error Patterns Library

Similar to MicroSaaSBot's 14 error patterns, SEOBlogBot has 12 SEO patterns:

| ID | Pattern | Category | Severity |
|----|---------|----------|----------|
| SITEMAP_404 | Sitemap returns 404 | sitemap | critical |
| SITEMAP_HTML | Sitemap returns HTML not XML | sitemap | critical |
| SITEMAP_EMPTY | Sitemap has 0 URLs | sitemap | critical |
| ROBOTS_BLOCK_ALL | Disallow: / in robots.txt | crawlability | critical |
| NOINDEX_PROD | X-Robots-Tag: noindex in production | crawlability | critical |
| MISSING_CANONICAL | No canonical tag on page | canonical | critical |
| DUPLICATE_CANONICAL | Multiple pages same canonical | canonical | critical |
| MISSING_TITLE | No <title> tag | meta | critical |
| MISSING_DESCRIPTION | No meta description | meta | high |
| INVALID_JSONLD | JSON-LD parse error | schema | high |
| MISSING_OG | No OpenGraph tags | meta | medium |
| SLOW_LCP | LCP > 2.5s | performance | medium |

---

## Specific Fixes for chudi-blog.vercel.app

Based on the issues identified (only 1 page indexed, sitemap can't be fetched):

### Issue 1: Sitemap Not Fetchable

**Root Cause Options:**
1. Middleware blocking /sitemap.xml
2. Caching returning stale/error response
3. Dynamic generation timing out

**Fix:**
```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';

// CRITICAL: Force fresh generation
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ... implementation
}
```

### Issue 2: Only 1 Page Indexed

**Root Cause Options:**
1. Other pages have noindex
2. Thin content flagged by Google
3. Internal linking insufficient
4. Crawl budget exhausted on errors

**Diagnosis Script:**
```typescript
// Check each page's indexability
const pages = await crawlSite('https://chudi-blog.vercel.app');
for (const page of pages) {
  const { noindex, canonical, title, wordCount } = await analyzePage(page);
  console.log({
    url: page,
    indexable: !noindex,
    hasCanonical: !!canonical,
    hasTitle: !!title,
    contentLength: wordCount,
    issue: wordCount < 300 ? 'THIN_CONTENT' : noindex ? 'NOINDEX' : 'OK'
  });
}
```

---

## Decision Tree

```
User Request
    │
    ├─► "audit my blog" ──────────────► Run /audit command
    │                                        │
    │                                        ├─► Gate 1: Sitemap ──► FAIL? ──► Fix sitemap.ts
    │                                        ├─► Gate 2: Schema ───► FAIL? ──► Add JSON-LD
    │                                        ├─► Gate 3: Meta ─────► FAIL? ──► Fix metadata
    │                                        ├─► Gate 4: Canonical ► FAIL? ──► Add canonicals
    │                                        ├─► Gate 5: Crawl ────► FAIL? ──► Fix robots.txt
    │                                        └─► Gate 8: CWV ──────► FAIL? ──► Optimize perf
    │
    ├─► "fix sitemap" ────────────────► Generate app/sitemap.ts template
    │
    ├─► "why am I not indexed" ───────► Run diagnostic crawl + GSC check
    │
    ├─► "add schema to posts" ────────► Generate JSON-LD components
    │
    └─► "check competitor X" ─────────► Run competitor analysis
```

---

## Quick Start

1. **Install the skill:**
```bash
mkdir -p ~/.claude/skills/seoblogbot
cp -r ./seoblogbot/* ~/.claude/skills/seoblogbot/
```

2. **Run initial audit:**
```bash
cd ~/your-blog-project
claude "Read ~/.claude/skills/seoblogbot/SKILL.md then audit this blog"
```

3. **Apply fixes:**
```bash
claude "/fix all"
```

4. **Verify fixes:**
```bash
npm run seo:audit
```

5. **Submit to GSC:**
```bash
claude "/monitor submit-sitemap"
```

---

## Success Criteria

After implementing SEOBlogBot fixes, chudi-blog.vercel.app should:

| Metric | Before | Target | Timeline |
|--------|--------|--------|----------|
| Pages Indexed | 1 | All blog posts | 2-4 weeks |
| Sitemap Status | "Couldn't fetch" | "Success" | 1-3 days |
| Schema Validation | Unknown | 0 errors | Immediate |
| Meta Completeness | Unknown | 100% | Immediate |
| Core Web Vitals | Unknown | All green | 1-2 weeks |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.1.0 | 2025-12-29 | Modular validators, multi-page crawling, performance gate, GSC stub |
| 1.0.0 | 2024-12-29 | Initial release with 6 gates |
