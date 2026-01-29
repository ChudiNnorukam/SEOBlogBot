# Command: /seo fix sitemap

**Trigger:** "fix sitemap", "sitemap not working", "couldn't fetch sitemap", "GSC can't fetch"

---

## Diagnostic Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  SITEMAP DIAGNOSIS                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ Check if sitemap.xml   │
              │ returns 200            │
              └────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
        [200 OK]                   [Not 200]
              │                         │
              ▼                         ▼
    ┌──────────────────┐    ┌──────────────────┐
    │ Check content    │    │ Does app/sitemap │
    │ is valid XML     │    │ .ts exist?       │
    └──────────────────┘    └──────────────────┘
              │                    │
       ┌──────┴──────┐      ┌──────┴──────┐
       │             │      │             │
   [Valid]      [Invalid]  [No]         [Yes]
       │             │      │             │
       ▼             ▼      ▼             ▼
  Check URL     Check for  Create     Check for
  count > 0     middleware  sitemap.ts  errors
       │             │      │             │
       ▼             ▼      ▼             ▼
  [SUCCESS]    Fix middleware  Apply      Fix
  or fix       to allow       template   async/env
  lastmod      /sitemap.xml              issues
```

---

## Step 1: Check Current State

```bash
# Run from Claude Code CLI
curl -sI https://chudi-blog.vercel.app/sitemap.xml
```

**Interpret results:**

| HTTP Status | Content-Type | Diagnosis |
|-------------|--------------|-----------|
| 200 | application/xml | Sitemap exists, check content |
| 200 | text/html | Error page being returned |
| 404 | any | No sitemap route exists |
| 500 | any | Server error in generation |

---

## Google Search Console Error List (Quick Fixes)

If GSC shows one of these errors, map it to the corresponding fix:

- **General HTTP errors / Couldn't fetch** → Fix sitemap route or middleware; ensure 200 OK
- **General network errors** → Check DNS, TLS, and hosting uptime
- **Invalid XML** → Make sure `/sitemap.xml` returns XML, not HTML/error pages
- **Too many URLs / Too many sitemaps** → Split sitemap and create a sitemap index
- **File size** → Keep uncompressed sitemap under 50MB; split if needed
- **Missing XML tag** → Ensure every `<url>` or `<sitemap>` has `<loc>`
- **Invalid tag value** → Use valid `changefreq` values and `priority` between 0.0–1.0
- **Invalid date** → Use ISO 8601 or `YYYY-MM-DD` for `lastmod`
- **Invalid URL / URL not allowed** → Only include absolute URLs on the same host and path scope
- **Path mismatch (www)** → Make sitemap host consistent with canonical host
- **Nested sitemap indexes** → Index files should only list URL sitemaps, not other indexes

---

## Step 2: Check for Existing Sitemap File

```bash
# Check if sitemap.ts exists
ls -la app/sitemap.ts 2>/dev/null || ls -la src/app/sitemap.ts 2>/dev/null || echo "No sitemap.ts found"

# Check for static sitemap.xml
ls -la public/sitemap.xml 2>/dev/null || echo "No static sitemap.xml"
```

---

## Step 3: Create or Fix Sitemap

### If No Sitemap Exists

Create `app/sitemap.ts`:

```typescript
// app/sitemap.ts
import type { MetadataRoute } from 'next';

// CRITICAL: Force dynamic generation
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface BlogPost {
  slug: string;
  updatedAt: string;
  publishedAt: string;
}

async function getBlogPosts(): Promise<BlogPost[]> {
  // Option 1: Fetch from CMS API
  // const res = await fetch('https://your-cms.com/api/posts', { cache: 'no-store' });
  // return res.json();
  
  // Option 2: Read from filesystem (for MDX blogs)
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const postsDir = path.join(process.cwd(), 'content/posts');
  const files = await fs.readdir(postsDir);
  
  const posts = await Promise.all(
    files
      .filter(f => f.endsWith('.mdx'))
      .map(async (file) => {
        const slug = file.replace('.mdx', '');
        const stat = await fs.stat(path.join(postsDir, file));
        return {
          slug,
          updatedAt: stat.mtime.toISOString(),
          publishedAt: stat.birthtime.toISOString(),
        };
      })
  );
  
  return posts;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://chudi-blog.vercel.app';
  
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
  
  // Dynamic blog posts
  let posts: BlogPost[] = [];
  try {
    posts = await getBlogPosts();
  } catch (error) {
    console.error('[Sitemap] Failed to fetch posts:', error);
    // Return static pages even on error
    return staticPages;
  }
  
  const postPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));
  
  return [...staticPages, ...postPages];
}
```

### If Sitemap Exists But Returns 500

**Check 1: Missing `force-dynamic`**

```typescript
// Add at top of app/sitemap.ts
export const dynamic = 'force-dynamic';
export const revalidate = 0;
```

**Check 2: Async error not caught**

```typescript
// Wrap in try-catch
try {
  const posts = await fetchPosts();
  // ...
} catch (error) {
  console.error('[Sitemap Error]:', error);
  return []; // Return empty rather than crash
}
```

**Check 3: Environment variable missing**

```bash
# Check Vercel environment variables
vercel env ls

# Ensure NEXT_PUBLIC_SITE_URL is set
vercel env add NEXT_PUBLIC_SITE_URL production
# Enter: https://chudi-blog.vercel.app
```

---

## Step 4: Add Cache Headers

Update `next.config.js`:

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/sitemap.xml',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
};
```

---

## Step 5: Check Middleware

If using authentication middleware, ensure sitemap is public:

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/blog(.*)',
  '/about',
  '/sitemap.xml',  // ADD THIS
  '/robots.txt',   // ADD THIS
  '/api/og(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
```

---

## Step 6: Verify Fix

```bash
# Test locally first
npm run dev
curl http://localhost:3000/sitemap.xml

# Deploy and test production
vercel deploy --prod
curl https://chudi-blog.vercel.app/sitemap.xml

# Verify URL count
curl -s https://chudi-blog.vercel.app/sitemap.xml | grep -c "<loc>"
```

---

## Step 7: Submit to Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Select your property
3. Navigate to Sitemaps (left sidebar)
4. If old sitemap shows "Couldn't fetch", click and delete it
5. Add new sitemap: `sitemap.xml`
6. Click Submit
7. Wait 10-30 minutes for initial fetch
8. Refresh page to see status

**Expected result:** Status should show "Success" with URL count matching your posts.

---

## Troubleshooting

### Still showing "Couldn't fetch" after fix

1. **Clear Vercel cache:**
   ```bash
   vercel --prod --force
   ```

2. **Check for redirect loops:**
   ```bash
   curl -IL https://chudi-blog.vercel.app/sitemap.xml
   ```

3. **Verify no authentication required:**
   ```bash
   curl -A "Googlebot" https://chudi-blog.vercel.app/sitemap.xml
   ```

4. **Check Vercel function logs:**
   - Go to Vercel Dashboard > Project > Logs
   - Filter by `/sitemap.xml`
   - Look for errors

### Sitemap works but pages not being indexed

This is a different issue - see `/seo fix indexing` command.

The sitemap is just discovery; indexing depends on content quality and other factors.
