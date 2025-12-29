# Gate 2: Indexability

**Severity:** CRITICAL (blocks deployment)
**Purpose:** Ensures Google CAN index your pages (no noindex, proper canonicals).

---

## What This Gate Validates

| Check | Severity | Pass Criteria |
|-------|----------|---------------|
| No X-Robots-Tag: noindex | CRITICAL | Production pages allow indexing |
| No meta robots noindex | CRITICAL | No `<meta name="robots" content="noindex">` |
| Canonical URL present | HIGH | All pages have `<link rel="canonical">` |
| Canonical self-referencing | HIGH | Canonical points to current URL |
| *.vercel.app blocked | MEDIUM | System URLs have noindex |
| Preview deployments blocked | MEDIUM | Non-production has noindex |

---

## The Vercel noindex Problem

Vercel automatically adds `X-Robots-Tag: noindex` to:
- Preview deployments (non-production branches)
- `*.vercel.app` system URLs

**The problem:** This protection does NOT always work correctly:
1. Custom domains on preview branches may NOT get noindex
2. Configuration errors can leak noindex to production
3. `.vercel.app` URLs can get indexed and compete with your domain

---

## Common Failure Patterns

### NOINDEX_HEADER - Production Has noindex Header

**Symptoms:**
- GSC shows "Excluded by 'noindex' tag"
- `curl -I` shows `X-Robots-Tag: noindex`
- Pages disappear from Google

**Root Causes:**
1. **VERCEL_ENV check wrong** - Checking wrong variable
2. **Headers applied globally** - Missing path specificity
3. **Middleware adding header** - Auth middleware side effect

**Diagnosis:**
```bash
# Check for noindex header
curl -sI https://chudi-blog.vercel.app | grep -i "x-robots"

# Should return NOTHING for production
# If you see "X-Robots-Tag: noindex", you have a problem
```

**Fix - Correct next.config.js:**
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      // ONLY add noindex to non-production environments
      ...(process.env.VERCEL_ENV !== 'production' ? [{
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      }] : []),
      
      // ALWAYS block .vercel.app URLs (even in production)
      {
        source: '/:path*',
        has: [{ type: 'host', value: '*.vercel.app' }],
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex' },
        ],
      },
    ];
  },
};
```

### NOINDEX_META - Page Has noindex Meta Tag

**Symptoms:**
- HTML source contains `<meta name="robots" content="noindex">`
- Page excluded from index despite no header

**Root Causes:**
1. **Metadata configuration error**
2. **Conditional logic bug**
3. **Draft post published without removing noindex**

**Diagnosis:**
```bash
# Check HTML for noindex meta
curl -s https://chudi-blog.vercel.app | grep -i "noindex"
```

**Fix - Check metadata configuration:**
```typescript
// app/layout.tsx - WRONG
export const metadata: Metadata = {
  robots: {
    index: false,  // ❌ This blocks indexing!
    follow: false,
  },
};

// app/layout.tsx - CORRECT
export const metadata: Metadata = {
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};
```

### CANONICAL_MISSING - No Canonical URL

**Symptoms:**
- GSC shows duplicate content warnings
- Pages compete with each other in rankings
- URL parameters create duplicates

**Why it matters:**
- Without canonical, Google guesses which URL is "main"
- `?utm_source=` parameters create duplicates
- Trailing slash variations split ranking signals

**Fix:**
```typescript
// app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL('https://chudi-blog.vercel.app'),
  alternates: {
    canonical: '/',  // For homepage
  },
};

// app/blog/[slug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const slug = (await params).slug;
  
  return {
    alternates: {
      canonical: `/blog/${slug}`,
    },
  };
}
```

### CANONICAL_MISMATCH - Canonical Points Elsewhere

**Symptoms:**
- Page A's canonical points to Page B
- Wrong page ranks for keywords
- Confusing GSC data

**Root Causes:**
1. **Copy-paste error** - Hardcoded canonical not updated
2. **Wrong variable** - Using wrong slug/URL
3. **Redirect remnants** - Old canonical from migrated content

**Fix:**
```typescript
// Ensure canonical matches actual URL
export async function generateMetadata({ params }): Promise<Metadata> {
  const slug = (await params).slug;
  const baseUrl = 'https://chudi-blog.vercel.app';
  
  // Canonical MUST match the actual URL
  const canonicalUrl = `${baseUrl}/blog/${slug}`;
  
  return {
    alternates: {
      canonical: canonicalUrl,
    },
  };
}
```

---

## Validation Script

```typescript
// Gate 2 validation

async function runIndexabilityGate(baseUrl: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  
  // Check homepage
  const response = await fetch(baseUrl);
  const headers = response.headers;
  const html = await response.text();
  
  // Check 1: X-Robots-Tag header
  const xRobots = headers.get('x-robots-tag') || '';
  if (xRobots.toLowerCase().includes('noindex')) {
    results.push({
      name: 'X-Robots-Tag Header',
      status: 'FAILED',
      severity: 'CRITICAL',
      message: `Production has X-Robots-Tag: ${xRobots}`,
      fix: 'Check VERCEL_ENV in next.config.js headers',
    });
  } else {
    results.push({
      name: 'X-Robots-Tag Header',
      status: 'PASSED',
      severity: 'CRITICAL',
      message: 'No blocking header',
    });
  }
  
  // Check 2: Meta robots tag
  const noindexMeta = /<meta[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i;
  if (noindexMeta.test(html)) {
    results.push({
      name: 'Meta Robots Tag',
      status: 'FAILED',
      severity: 'CRITICAL',
      message: 'Page has noindex meta tag',
      fix: 'Remove noindex from metadata configuration',
    });
  } else {
    results.push({
      name: 'Meta Robots Tag',
      status: 'PASSED',
      severity: 'CRITICAL',
    });
  }
  
  // Check 3: Canonical URL
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  if (!canonicalMatch) {
    results.push({
      name: 'Canonical URL',
      status: 'WARNING',
      severity: 'HIGH',
      message: 'No canonical URL found',
      fix: 'Add alternates.canonical to metadata',
    });
  } else {
    const canonical = canonicalMatch[1];
    const expectedCanonical = baseUrl.replace(/\/$/, '');
    
    if (!canonical.includes(new URL(baseUrl).hostname)) {
      results.push({
        name: 'Canonical Domain',
        status: 'WARNING',
        severity: 'HIGH',
        message: `Canonical points to different domain: ${canonical}`,
      });
    } else {
      results.push({
        name: 'Canonical URL',
        status: 'PASSED',
        severity: 'HIGH',
        message: canonical,
      });
    }
  }
  
  return results;
}
```

---

## Manual Verification

```bash
# Check for noindex header on production
curl -sI https://chudi-blog.vercel.app | grep -i "x-robots"
# Expected: Nothing (no X-Robots-Tag header)

# Check for noindex in HTML
curl -s https://chudi-blog.vercel.app | grep -i "noindex"
# Expected: Nothing

# Check canonical URL
curl -s https://chudi-blog.vercel.app | grep -i "canonical"
# Expected: <link rel="canonical" href="https://chudi-blog.vercel.app">

# Verify .vercel.app has noindex (correct behavior)
curl -sI https://chudi-blog.vercel.app | grep -i "x-robots"
# Expected: X-Robots-Tag: noindex (if accessing via .vercel.app domain)
```

---

## Environment Variable Check

Ensure these are set correctly in Vercel:

```bash
# Check current environment
vercel env ls

# VERCEL_ENV should be:
# - "production" for production deployments
# - "preview" for preview deployments
# - "development" for local

# This is set automatically by Vercel, but check next.config.js uses it correctly
```

---

## After Fixing

1. **Redeploy:**
   ```bash
   vercel --prod
   ```

2. **Verify headers:**
   ```bash
   curl -sI https://chudi-blog.vercel.app | grep -i "x-robots"
   ```

3. **Request re-indexing in GSC:**
   - URL Inspection > Enter URL > Request Indexing

4. **Monitor:**
   - GSC > Pages > Check for "Excluded by noindex" decreasing
   - Wait 1-2 weeks for full re-crawl
