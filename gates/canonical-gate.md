# Gate 4: Canonical URL Verification

**Severity:** HIGH (warning with strong recommendation)
**Purpose:** Ensures canonical URLs prevent duplicate content and consolidate ranking signals.

---

## What This Gate Validates

| Check | Severity | Pass Criteria |
|-------|----------|---------------|
| Canonical Present | HIGH | Every page has `<link rel="canonical">` |
| Canonical Self-Referencing | HIGH | Points to current page URL |
| Canonical Absolute URL | MEDIUM | Full URL, not relative path |
| Canonical Domain Match | HIGH | Same domain as site |
| Canonical HTTPS | MEDIUM | Uses HTTPS, not HTTP |
| No Conflicting Signals | HIGH | Canonical matches actual URL |

---

## Why Canonicals Matter

### The Duplicate Content Problem

Without canonicals, Google sees these as different pages:
- `https://chudi-blog.vercel.app/blog/post`
- `https://chudi-blog.vercel.app/blog/post/`
- `https://chudi-blog.vercel.app/blog/post?utm_source=twitter`
- `https://www.chudi-blog.vercel.app/blog/post`
- `http://chudi-blog.vercel.app/blog/post`

Each version splits your ranking signals (backlinks, engagement) across URLs.

### Canonical Solution

```html
<link rel="canonical" href="https://chudi-blog.vercel.app/blog/post">
```

Tells Google: "This is the ONE URL that should rank. Consolidate all signals here."

---

## Common Failure Patterns

### CANONICAL_MISSING - No Canonical Tag

**Symptoms:**
- GSC shows duplicate content warnings
- Same content ranking for different URL variations
- Inconsistent rankings

**Root Cause:**
Missing `alternates.canonical` in metadata configuration.

**Fix:**
```typescript
// app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL('https://chudi-blog.vercel.app'),
  alternates: {
    canonical: '/',
  },
};

// app/blog/[slug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const slug = (await params).slug;
  
  return {
    alternates: {
      canonical: `/blog/${slug}`,  // Relative to metadataBase
    },
  };
}
```

### CANONICAL_RELATIVE - Using Relative URL

**Symptoms:**
- Canonical shows `/blog/post` instead of full URL
- Some crawlers may misinterpret

**Bad:**
```html
<link rel="canonical" href="/blog/post">
```

**Good:**
```html
<link rel="canonical" href="https://chudi-blog.vercel.app/blog/post">
```

**Fix:**
```typescript
// Ensure metadataBase is set in root layout
export const metadata: Metadata = {
  metadataBase: new URL('https://chudi-blog.vercel.app'),
  // Now relative canonicals become absolute automatically
};
```

### CANONICAL_MISMATCH - Points to Wrong URL

**Symptoms:**
- Page A's canonical points to Page B
- GSC shows "Duplicate, Google chose different canonical"
- Wrong page ranks for keywords

**Root Causes:**
1. Hardcoded canonical not updated
2. Copy-paste error from template
3. CMS returning wrong URL

**Diagnosis:**
```bash
# Check what canonical a page has
curl -s https://chudi-blog.vercel.app/blog/my-post | \
  grep -o '<link[^>]*rel="canonical"[^>]*>' 
```

**Fix:**
```typescript
// Dynamically generate canonical from actual URL
export async function generateMetadata({ params }): Promise<Metadata> {
  const slug = (await params).slug;
  
  // WRONG - hardcoded
  // canonical: 'https://chudi-blog.vercel.app/blog/old-post',
  
  // CORRECT - dynamic
  return {
    alternates: {
      canonical: `/blog/${slug}`,
    },
  };
}
```

### CANONICAL_TRAILING_SLASH - Inconsistent Trailing Slashes

**Symptoms:**
- Some canonicals have trailing slash, some don't
- GSC shows both versions indexed

**Fix - Choose one pattern and stick to it:**
```javascript
// next.config.js
module.exports = {
  trailingSlash: false,  // or true, just be consistent
};
```

```typescript
// Normalize in metadata
export async function generateMetadata({ params }): Promise<Metadata> {
  const slug = (await params).slug;
  const canonicalPath = `/blog/${slug}`.replace(/\/$/, '');  // Remove trailing slash
  
  return {
    alternates: {
      canonical: canonicalPath,
    },
  };
}
```

### CANONICAL_HTTP - Using HTTP Instead of HTTPS

**Symptoms:**
- Canonical uses `http://` but site is on `https://`
- Redirect chain issues

**Fix:**
```typescript
// Ensure metadataBase uses HTTPS
export const metadata: Metadata = {
  metadataBase: new URL('https://chudi-blog.vercel.app'),  // HTTPS!
};
```

---

## Validation Script

```typescript
// Gate 4: Canonical URL Validation

async function runCanonicalGate(baseUrl: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const normalizedBase = baseUrl.replace(/\/$/, '');
  
  try {
    const response = await fetch(baseUrl);
    const html = await response.text();
    const finalUrl = response.url.replace(/\/$/, '');
    
    // Extract canonical
    const canonicalMatch = html.match(
      /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i
    );
    
    if (!canonicalMatch) {
      results.push({
        name: 'Canonical Presence',
        status: 'WARNING',
        severity: 'HIGH',
        message: 'No canonical URL found',
        fix: 'Add alternates.canonical to page metadata',
      });
      return results;
    }
    
    const canonical = canonicalMatch[1];
    
    results.push({
      name: 'Canonical Presence',
      status: 'PASSED',
      severity: 'HIGH',
      message: canonical,
    });
    
    // Check if absolute URL
    if (!canonical.startsWith('http')) {
      results.push({
        name: 'Canonical Absolute URL',
        status: 'WARNING',
        severity: 'MEDIUM',
        message: `Relative canonical: ${canonical}`,
        fix: 'Set metadataBase in root layout',
      });
    }
    
    // Check HTTPS
    if (canonical.startsWith('http://')) {
      results.push({
        name: 'Canonical HTTPS',
        status: 'WARNING',
        severity: 'MEDIUM',
        message: 'Canonical uses HTTP instead of HTTPS',
        fix: 'Update metadataBase to use https://',
      });
    }
    
    // Check domain match
    try {
      const canonicalUrl = new URL(canonical, baseUrl);
      const baseUrlParsed = new URL(baseUrl);
      
      if (canonicalUrl.hostname !== baseUrlParsed.hostname) {
        results.push({
          name: 'Canonical Domain',
          status: 'WARNING',
          severity: 'HIGH',
          message: `Canonical domain (${canonicalUrl.hostname}) differs from site (${baseUrlParsed.hostname})`,
          fix: 'Ensure canonical points to your primary domain',
        });
      }
    } catch {
      // URL parsing failed, likely relative URL
    }
    
    // Check self-referencing (canonical should match current URL)
    const normalizedCanonical = canonical.replace(/\/$/, '');
    if (normalizedCanonical !== finalUrl && 
        normalizedCanonical !== normalizedBase) {
      results.push({
        name: 'Canonical Self-Reference',
        status: 'WARNING',
        severity: 'HIGH',
        message: `Canonical (${canonical}) doesn't match URL (${finalUrl})`,
        fix: 'Canonical should point to the current page URL',
      });
    } else {
      results.push({
        name: 'Canonical Self-Reference',
        status: 'PASSED',
        severity: 'HIGH',
      });
    }
    
  } catch (error) {
    results.push({
      name: 'Canonical Analysis',
      status: 'FAILED',
      severity: 'HIGH',
      message: error instanceof Error ? error.message : 'Failed to analyze',
    });
  }
  
  return results;
}
```

---

## Site-Wide Canonical Audit

```bash
# Crawl site and check all canonicals
npx ts-node scripts/audit-canonicals.ts https://chudi-blog.vercel.app
```

```typescript
// scripts/audit-canonicals.ts
import { PlaywrightCrawler, Dataset } from 'crawlee';

interface CanonicalIssue {
  url: string;
  canonical: string | null;
  issue: string;
}

const issues: CanonicalIssue[] = [];

const crawler = new PlaywrightCrawler({
  maxRequestsPerCrawl: 100,
  async requestHandler({ request, page, enqueueLinks }) {
    const url = request.url;
    
    // Get canonical
    const canonical = await page.$eval(
      'link[rel="canonical"]',
      (el) => el.getAttribute('href')
    ).catch(() => null);
    
    if (!canonical) {
      issues.push({ url, canonical: null, issue: 'MISSING' });
    } else if (!canonical.startsWith('http')) {
      issues.push({ url, canonical, issue: 'RELATIVE' });
    } else if (canonical.startsWith('http://')) {
      issues.push({ url, canonical, issue: 'HTTP_NOT_HTTPS' });
    } else {
      const normalizedUrl = url.replace(/\/$/, '');
      const normalizedCanonical = canonical.replace(/\/$/, '');
      if (normalizedUrl !== normalizedCanonical) {
        issues.push({ url, canonical, issue: 'MISMATCH' });
      }
    }
    
    await enqueueLinks({
      globs: ['https://chudi-blog.vercel.app/**'],
      exclude: ['**/api/**', '**/_next/**'],
    });
  },
});

await crawler.run(['https://chudi-blog.vercel.app']);

console.log('\n=== Canonical Issues ===\n');
issues.forEach(i => {
  console.log(`${i.issue}: ${i.url}`);
  console.log(`  Canonical: ${i.canonical || 'NONE'}\n`);
});
```

---

## Special Cases

### Paginated Content

For paginated blog listings:

```typescript
// app/blog/page/[num]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const pageNum = parseInt((await params).num);
  
  return {
    alternates: {
      // Page 1 canonical should be /blog, not /blog/page/1
      canonical: pageNum === 1 ? '/blog' : `/blog/page/${pageNum}`,
    },
  };
}
```

### Multi-Language Sites

```typescript
export const metadata: Metadata = {
  alternates: {
    canonical: '/blog/post',
    languages: {
      'en-US': '/en/blog/post',
      'es-ES': '/es/blog/post',
    },
  },
};
```

### Syndicated Content

If your content is republished elsewhere, canonical should point to YOUR site:

```typescript
// Your site is the original source
export const metadata: Metadata = {
  alternates: {
    canonical: 'https://chudi-blog.vercel.app/blog/original-post',
  },
};

// On syndication partners, they should use YOUR URL as canonical
// (You can't control this, but you can request it)
```

---

## Verification

```bash
# Check single page canonical
curl -s https://chudi-blog.vercel.app/blog/my-post | \
  grep -oP '(?<=<link rel="canonical" href=")[^"]*'

# Check all pages have canonicals
for url in $(curl -s https://chudi-blog.vercel.app/sitemap.xml | \
  grep -oP '(?<=<loc>)[^<]*'); do
  canonical=$(curl -s "$url" | grep -oP '(?<=<link rel="canonical" href=")[^"]*')
  echo "$url -> $canonical"
done
```
