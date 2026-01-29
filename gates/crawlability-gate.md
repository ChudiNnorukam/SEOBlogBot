# Gate 1: Crawlability

**Severity:** CRITICAL (blocks deployment)
**Purpose:** Ensures Google can discover and access your site's content.

---

## What This Gate Validates

| Check | Severity | Pass Criteria |
|-------|----------|---------------|
| Sitemap HTTP Status | CRITICAL | Returns 200 OK |
| Sitemap Content-Type | CRITICAL | Contains `xml` |
| Sitemap XML Structure | CRITICAL | Contains `<urlset>` or `<?xml` |
| Sitemap URL Count | CRITICAL | > 0 URLs |
| Sitemap lastmod Tags | MEDIUM | Present for freshness signals |
| Sitemap URLs Blocked by robots.txt | HIGH | Sitemap URLs not disallowed |
| Sitemap Encoding | LOW | UTF-8 declared or assumed |
| Robots.txt Status | MEDIUM | Returns 200 OK |
| Robots.txt No Blanket Block | CRITICAL | No `Disallow: /` for all agents |
| Robots.txt Sitemap Reference | MEDIUM | Contains `Sitemap:` directive |
| AI Crawler Permissions | LOW | Allows GPTBot, ClaudeBot |
| Robots.txt File Size | MEDIUM | <= 500KB |

---

## Google Sitemaps Error List Coverage (as of Jan 1, 2026)

| GSC Error | SEOBlogBot Check | Auto? | Notes |
|-----------|------------------|-------|-------|
| General HTTP errors | Sitemap HTTP Status | Yes | 4xx/5xx blocked |
| General network errors | Sitemap Fetch | Yes | DNS/timeout |
| Invalid XML | Sitemap XML Structure | Yes | Must be <urlset> or <sitemapindex> |
| Too many sitemaps | Too Many Sitemaps | Yes | > 50,000 entries in index |
| Too many URLs | Too Many URLs | Yes | > 50,000 URLs in a sitemap |
| File size | Sitemap File Size | Yes | > 50MB uncompressed |
| Missing XML tag | Missing XML tag | Yes | Missing <loc> |
| Invalid tag value | Invalid Tag Value | Yes | Invalid changefreq/priority |
| Invalid date | Invalid Date | Yes | Invalid lastmod |
| Invalid URL | Invalid URL | Yes | Non-absolute or malformed |
| Invalid URL in sitemap index file | Invalid URL / Incomplete URL | Yes | Index <loc> must be absolute |
| Nested sitemap indexes | Nested Sitemap Indexes | Partial | Checks first 10 child sitemaps |
| URL not allowed | URL Not Allowed | Yes | Host/path scope mismatch |
| Path mismatch (www) | Path Mismatch (www) | Yes | www vs non-www mismatch |
| URLs blocked by robots.txt | Robots.txt Blanket Block | Partial | Per-URL disallow requires manual or crawl check |

---

## Common Failure Patterns

### SITEMAP_500 - Sitemap Returns Server Error

**Symptoms:**
- Google Search Console shows "Couldn't fetch"
- `curl https://your-site.com/sitemap.xml` returns 500

**Root Causes:**
1. **Missing `force-dynamic` export** - Next.js caches sitemap as static
2. **Middleware blocking** - Auth middleware intercepts /sitemap.xml
3. **Database error** - Sitemap generation queries failing
4. **Missing environment variables** - CMS API keys not set in production

**Fix:**
```typescript
// app/sitemap.ts
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ... generation logic
}
```

### SITEMAP_EMPTY - Sitemap Contains 0 URLs

**Symptoms:**
- Sitemap returns 200 but has no `<url>` entries
- GSC shows sitemap success but 0 discovered URLs

**Root Causes:**
1. **Async data fetch not awaited**
2. **CMS API returning empty array**
3. **Filter logic excluding all posts**
4. **Environment variable missing for API**

**Fix:**
```typescript
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Always include static pages
  const staticUrls = [
    { url: 'https://your-site.com', lastModified: new Date() },
    { url: 'https://your-site.com/blog', lastModified: new Date() },
  ];
  
  // Fetch dynamic content with error handling
  let posts: Post[] = [];
  try {
    posts = await fetchPosts();
  } catch (error) {
    console.error('Sitemap: Failed to fetch posts:', error);
    // Return static URLs even if dynamic fetch fails
    return staticUrls;
  }
  
  const postUrls = posts.map(post => ({
    url: `https://your-site.com/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
  }));
  
  return [...staticUrls, ...postUrls];
}
```

### ROBOTS_BLANKET_BLOCK - Blocking All Crawlers

**Symptoms:**
- Site not indexed at all
- GSC shows "Blocked by robots.txt"

**Root Causes:**
1. **Leftover from development** - `Disallow: /` not removed
2. **Misconfigured template**
3. **Environment check gone wrong**

**Fix:**
```typescript
// app/robots.ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/_next/'],
      },
    ],
    sitemap: 'https://your-site.com/sitemap.xml',
  };
}
```

---

## Validation Script

```typescript
// Gate 1 validation from seo-preflight.ts

async function runCrawlabilityGate(baseUrl: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  
  // 1. Check sitemap
  const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`);
  if (!sitemapRes.ok) {
    results.push({
      name: 'Sitemap HTTP Status',
      status: 'FAILED',
      severity: 'CRITICAL',
      message: `Returns ${sitemapRes.status}`,
      fix: 'Create app/sitemap.ts with force-dynamic',
    });
  }
  
  // 2. Check robots.txt
  const robotsRes = await fetch(`${baseUrl}/robots.txt`);
  const robotsText = await robotsRes.text();
  if (robotsText.includes('Disallow: /\n') || robotsText.includes('Disallow: /*')) {
    results.push({
      name: 'Robots.txt Blanket Block',
      status: 'FAILED', 
      severity: 'CRITICAL',
      message: 'Blocking all crawlers',
      fix: 'Change Disallow: / to allow crawling',
    });
  }
  
  return results;
}
```

---

## Manual Verification

```bash
# Check sitemap accessibility
curl -I https://chudi-blog.vercel.app/sitemap.xml
# Expected: HTTP/2 200, content-type: application/xml

# Check sitemap content
curl https://chudi-blog.vercel.app/sitemap.xml | head -20
# Expected: <?xml... <urlset>... <url>...

# Check robots.txt
curl https://chudi-blog.vercel.app/robots.txt
# Expected: User-agent: * Allow: / Sitemap: ...

# Verify no blocking
curl -A "Googlebot" https://chudi-blog.vercel.app/
# Expected: 200 OK with full HTML content
```

---

## Integration with Google Search Console

After fixing crawlability issues:

1. **Resubmit sitemap:**
   - Go to GSC > Sitemaps
   - Delete old sitemap if stuck in error state
   - Submit fresh: `https://your-site.com/sitemap.xml`

2. **Request reprocessing:**
   - Wait 24-48 hours for sitemap to be fetched
   - Check "Sitemaps" report for success status

3. **Monitor coverage:**
   - GSC > Pages > See data about indexed pages
   - Look for "Discovered - currently not indexed" → "Indexed"
