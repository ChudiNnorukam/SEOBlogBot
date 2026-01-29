# Gate 3: Metadata

**Severity:** WARNING (deployment proceeds with alert)
**Purpose:** Ensures all pages have proper title, description, and social tags.

---

## What This Gate Validates

| Check | Severity | Pass Criteria |
|-------|----------|---------------|
| Title tag present | HIGH | Every page has `<title>` |
| Title length | MEDIUM | 30-60 characters |
| Title uniqueness | MEDIUM | No duplicate titles across pages |
| Meta description present | HIGH | Every page has description |
| Description length | MEDIUM | 120-160 characters |
| OG title present | MEDIUM | `og:title` on all pages |
| OG description present | MEDIUM | `og:description` on all pages |
| OG image present | MEDIUM | `og:image` with valid URL |
| Twitter card present | LOW | `twitter:card` meta tag |
| Hreflang tags (if present) | MEDIUM | Valid `hreflang` values + absolute URLs |
| Mobile meta parity | MEDIUM | Mobile and desktop metadata consistent |
| Mobile content parity | MEDIUM | Mobile text content roughly matches desktop |

---

## Why Metadata Matters

### Title Tags
- **Primary ranking factor** - Google uses title for understanding page topic
- **SERP display** - Title appears as clickable link in search results
- **CTR impact** - Compelling titles get more clicks

### Meta Descriptions
- **Not a ranking factor** - But affects click-through rate
- **SERP snippet** - Google often uses this as description
- **If missing** - Google auto-generates from page content (often poorly)

### Open Graph Tags
- **Social sharing** - Controls how links appear on Facebook, LinkedIn
- **Rich previews** - Image + title + description in social posts
- **Viral potential** - Better previews get more shares

---

## Common Failure Patterns

### TITLE_MISSING - No Title Tag

**Symptoms:**
- Page shows URL or "Untitled" in browser tab
- SERP shows truncated URL instead of title
- GSC reports "Missing title tag"

**Fix:**
```typescript
// For static pages - export metadata
export const metadata: Metadata = {
  title: 'About Me',  // Uses template: "About Me | Chudi Blog"
};

// For dynamic pages - generateMetadata
export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await getPost(params.slug);
  return {
    title: post.title,
  };
}
```

### TITLE_TOO_LONG - Title Exceeds 60 Characters

**Symptoms:**
- Title truncated with "..." in search results
- Important keywords cut off

**Guidelines:**
- **Ideal:** 50-60 characters
- **Maximum:** 60 characters (Google truncates ~600px width)
- **Front-load keywords** - Put important terms first

**Fix:**
```typescript
// Instead of:
title: 'A Comprehensive Guide to Building Production-Ready MicroSaaS Applications with Claude Code CLI'
// 103 characters - will be truncated

// Use:
title: 'Building MicroSaaS with Claude Code CLI | Complete Guide'
// 55 characters - fits perfectly
```

### DESC_MISSING - No Meta Description

**Symptoms:**
- Google generates snippet from random page content
- Inconsistent SERP appearance
- Lower click-through rates

**Fix:**
```typescript
export const metadata: Metadata = {
  description: 'Learn to build production-ready MicroSaaS applications using Claude Code CLI. Step-by-step guide with security validation and deployment automation.',
};
```

### DESC_TOO_SHORT - Description Under 120 Characters

**Guidelines:**
- **Minimum:** 120 characters (use the space!)
- **Ideal:** 150-160 characters
- **Maximum:** 160 characters (Google truncates after this)

**Fix:**
```typescript
// Instead of:
description: 'Build MicroSaaS with AI.'
// 24 characters - wasting opportunity

// Use:
description: 'Build production-ready MicroSaaS applications using Claude Code CLI. Includes security validation gates, Stripe integration patterns, and automated deployment workflows.'
// 168 characters - comprehensive but may be slightly truncated
```

### OG_IMAGE_MISSING - No Social Preview Image

**Symptoms:**
- Links shared on social media show no image
- Reduced engagement on social shares
- Unprofessional appearance

**Requirements:**
- **Size:** 1200x630 pixels (1.91:1 ratio)
- **Format:** PNG or JPG
- **File size:** Under 8MB (ideally under 1MB)
- **URL:** Must be absolute (https://...)

**Fix:**
```typescript
export const metadata: Metadata = {
  openGraph: {
    images: [
      {
        url: 'https://chudi-blog.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Chudi Blog - AI Systems Engineering',
      },
    ],
  },
};
```

---

## Validation Script

```typescript
// Gate 3 validation from seo-preflight.ts

async function runMetaGate(baseUrl: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  
  const response = await fetch(baseUrl);
  const html = await response.text();
  
  // Check 1: Title tag
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  if (!titleMatch) {
    results.push({
      name: 'Title Tag',
      status: 'FAILED',
      severity: 'HIGH',
      message: 'No title tag found',
      fix: 'Add title to metadata export',
    });
  } else {
    const title = titleMatch[1];
    
    // Check title length
    if (title.length < 30) {
      results.push({
        name: 'Title Length',
        status: 'WARNING',
        severity: 'MEDIUM',
        message: `Title too short: ${title.length} chars (min 30)`,
      });
    } else if (title.length > 60) {
      results.push({
        name: 'Title Length',
        status: 'WARNING',
        severity: 'MEDIUM',
        message: `Title too long: ${title.length} chars (max 60)`,
        fix: 'Shorten title to under 60 characters',
      });
    } else {
      results.push({
        name: 'Title Tag',
        status: 'PASSED',
        severity: 'HIGH',
        message: `${title.length} chars: "${title.slice(0, 50)}..."`,
      });
    }
  }
  
  // Check 2: Meta description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
  if (!descMatch) {
    results.push({
      name: 'Meta Description',
      status: 'WARNING',
      severity: 'HIGH',
      message: 'No meta description found',
      fix: 'Add description to metadata export',
    });
  } else {
    const desc = descMatch[1];
    
    if (desc.length < 120) {
      results.push({
        name: 'Description Length',
        status: 'WARNING',
        severity: 'MEDIUM',
        message: `Description too short: ${desc.length} chars (min 120)`,
      });
    } else if (desc.length > 160) {
      results.push({
        name: 'Description Length',
        status: 'WARNING',
        severity: 'LOW',
        message: `Description may be truncated: ${desc.length} chars (max 160)`,
      });
    } else {
      results.push({
        name: 'Meta Description',
        status: 'PASSED',
        severity: 'HIGH',
      });
    }
  }
  
  // Check 3: OG tags
  const ogTitle = html.match(/<meta[^>]*property=["']og:title["']/i);
  const ogDesc = html.match(/<meta[^>]*property=["']og:description["']/i);
  const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i);
  
  if (!ogTitle || !ogDesc) {
    results.push({
      name: 'Open Graph Tags',
      status: 'WARNING',
      severity: 'MEDIUM',
      message: 'Missing og:title or og:description',
      fix: 'Add openGraph to metadata export',
    });
  } else {
    results.push({
      name: 'Open Graph Tags',
      status: 'PASSED',
      severity: 'MEDIUM',
    });
  }
  
  if (!ogImage) {
    results.push({
      name: 'OG Image',
      status: 'WARNING',
      severity: 'MEDIUM',
      message: 'No og:image found',
      fix: 'Add images array to openGraph metadata',
    });
  } else {
    // Verify image URL is absolute
    const imageUrl = ogImage[1];
    if (!imageUrl.startsWith('http')) {
      results.push({
        name: 'OG Image URL',
        status: 'WARNING',
        severity: 'MEDIUM',
        message: 'og:image should be absolute URL',
        fix: 'Use full URL starting with https://',
      });
    } else {
      results.push({
        name: 'OG Image',
        status: 'PASSED',
        severity: 'MEDIUM',
        message: imageUrl,
      });
    }
  }
  
  // Check 4: Twitter card
  const twitterCard = html.match(/<meta[^>]*name=["']twitter:card["']/i);
  if (!twitterCard) {
    results.push({
      name: 'Twitter Card',
      status: 'WARNING',
      severity: 'LOW',
      message: 'No twitter:card meta tag',
      fix: 'Add twitter to metadata export',
    });
  } else {
    results.push({
      name: 'Twitter Card',
      status: 'PASSED',
      severity: 'LOW',
    });
  }
  
  return results;
}
```

---

## Manual Verification

```bash
# Check title
curl -s https://chudi-blog.vercel.app | grep -o "<title>.*</title>"

# Check description
curl -s https://chudi-blog.vercel.app | grep -oP '(?<=<meta name="description" content=")[^"]*'

# Check all meta tags
curl -s https://chudi-blog.vercel.app | grep -o '<meta[^>]*>' | head -20

# Check OG tags specifically
curl -s https://chudi-blog.vercel.app | grep -o '<meta property="og:[^>]*>'

# Validate with online tools
# - https://metatags.io/
# - https://www.opengraph.xyz/
# - https://cards-dev.twitter.com/validator
```

---

## Bulk Metadata Audit

To check all pages, not just homepage:

```typescript
// scripts/audit-all-metadata.ts
import { chromium } from 'playwright';

async function auditAllPages(baseUrl: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Get all URLs from sitemap
  const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`);
  const sitemapXml = await sitemapRes.text();
  const urls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  
  const issues: Array<{ url: string; issue: string }> = [];
  
  for (const url of urls) {
    await page.goto(url);
    
    // Check title
    const title = await page.title();
    if (!title || title.length < 10) {
      issues.push({ url, issue: `Missing or short title: "${title}"` });
    }
    
    // Check description
    const desc = await page.$eval(
      'meta[name="description"]',
      el => el.getAttribute('content')
    ).catch(() => null);
    
    if (!desc) {
      issues.push({ url, issue: 'Missing meta description' });
    }
    
    // Check OG image
    const ogImage = await page.$eval(
      'meta[property="og:image"]',
      el => el.getAttribute('content')
    ).catch(() => null);
    
    if (!ogImage) {
      issues.push({ url, issue: 'Missing og:image' });
    }
  }
  
  await browser.close();
  return issues;
}
```

---

## Best Practices Checklist

### Title Tags
- [ ] Every page has unique title
- [ ] Titles are 30-60 characters
- [ ] Primary keyword appears in title
- [ ] Brand name at end (via template)
- [ ] No keyword stuffing

### Meta Descriptions
- [ ] Every page has unique description
- [ ] Descriptions are 120-160 characters
- [ ] Include call-to-action when appropriate
- [ ] Accurately describe page content
- [ ] Include target keyword naturally

### Open Graph
- [ ] og:title matches or complements title
- [ ] og:description optimized for social
- [ ] og:image is 1200x630 pixels
- [ ] og:image URL is absolute
- [ ] og:type is correct (website, article)

### Twitter Cards
- [ ] twitter:card is set (summary_large_image)
- [ ] twitter:creator is your handle
- [ ] Images meet Twitter's requirements
