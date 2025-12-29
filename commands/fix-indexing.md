# Command: /seo fix indexing

**Trigger:** "pages not indexed", "Google won't index", "crawled not indexed", "discovered not indexed"

---

## Understanding Indexing Status

Google Search Console shows several indexing states:

| Status | Meaning | Urgency |
|--------|---------|---------|
| **Indexed** | ✅ Page in Google's index | None |
| **Discovered - currently not indexed** | Found via sitemap/links but not crawled | Medium |
| **Crawled - currently not indexed** | Crawled but Google chose NOT to index | High |
| **Excluded by noindex tag** | Explicit noindex directive | Critical |
| **Blocked by robots.txt** | robots.txt prevents crawling | Critical |
| **Duplicate without canonical** | Duplicate content detected | High |
| **Soft 404** | Page appears empty/low value | High |

---

## Diagnostic Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  INDEXING DIAGNOSIS                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ What status does GSC   │
              │ show for this page?    │
              └────────────────────────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
       ▼                   ▼                   ▼
  [Excluded by        [Crawled -         [Discovered -
   noindex]            not indexed]       not indexed]
       │                   │                   │
       ▼                   ▼                   ▼
  Fix noindex         Improve            Improve
  (Gate 2 issue)      content quality    crawl priority
```

---

## Step 1: Check Indexing Status in GSC

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Navigate to **Pages** (left sidebar)
3. Click on the status affecting your pages
4. Note which specific pages are affected

---

## Step 2: Run URL Inspection

For each affected page:

1. GSC > URL Inspection > Enter page URL
2. Check:
   - **Indexing status** - Is it indexed?
   - **Crawl status** - When was it last crawled?
   - **Robots.txt** - Is it blocked?
   - **Canonical** - What canonical is detected?
   - **User-declared canonical** - What you specified

---

## Issue: "Excluded by noindex tag"

**This is a Gate 2 (Indexability) issue.**

See: [Indexability Gate](../gates/indexability-gate.md)

**Quick fix:**
```bash
# Check for noindex header
curl -sI https://chudi-blog.vercel.app/blog/your-post | grep -i "x-robots"

# Check for noindex meta
curl -s https://chudi-blog.vercel.app/blog/your-post | grep -i "noindex"
```

---

## Issue: "Crawled - currently not indexed"

**This is the hardest to fix.** Google crawled your page and decided it's not worth indexing.

### Root Causes

1. **Low content quality** - Thin, duplicate, or unhelpful content
2. **Low site authority** - New site with few backlinks
3. **Poor E-E-A-T signals** - No author info, no about page
4. **Technical issues** - Slow load, poor mobile experience
5. **Google's algorithm** - 2024-2025 updates raised the bar significantly

### Diagnosis Checklist

```markdown
□ Content Quality
  □ Word count > 1000 for cornerstone content?
  □ Original insights, not just rehashed info?
  □ Unique value compared to existing search results?
  □ Proper formatting (headings, lists, images)?

□ E-E-A-T Signals
  □ Author bio with credentials?
  □ About page with organization info?
  □ Contact information visible?
  □ Social proof (testimonials, media mentions)?

□ Technical Quality
  □ Mobile-friendly (Lighthouse mobile score > 90)?
  □ Fast loading (LCP < 2.5s)?
  □ No layout shifts (CLS < 0.1)?
  □ HTTPS enabled?

□ Internal Linking
  □ Linked from homepage or main navigation?
  □ At least 3 internal links pointing to this page?
  □ Contextually relevant anchor text?

□ External Signals
  □ Any backlinks from other sites?
  □ Social media mentions?
  □ Referenced in other content?
```

### Improvement Actions

**1. Enhance Content Quality**

```typescript
// Ensure content meets minimum quality bar
interface ContentQualityCheck {
  wordCount: number;        // Target: > 1000 for core content
  headingCount: number;     // Target: H2s every 300 words
  imageCount: number;       // Target: 1 per 500 words
  linkCount: number;        // Target: 2-3 external sources
  readingTime: number;      // Target: 5-10 minutes
}

function assessContentQuality(content: string): ContentQualityCheck {
  const words = content.split(/\s+/).length;
  const headings = (content.match(/<h[2-3]/gi) || []).length;
  const images = (content.match(/<img/gi) || []).length;
  const links = (content.match(/<a[^>]*href="http/gi) || []).length;
  
  return {
    wordCount: words,
    headingCount: headings,
    imageCount: images,
    linkCount: links,
    readingTime: Math.ceil(words / 200),
  };
}
```

**2. Add Author Schema (E-E-A-T)**

```typescript
// components/AuthorBox.tsx
export function AuthorBox({ author }) {
  const authorSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: author.name,
    url: `https://chudi-blog.vercel.app/about`,
    image: author.image,
    jobTitle: author.title,
    description: author.bio,
    sameAs: [
      author.twitter,
      author.linkedin,
      author.github,
    ].filter(Boolean),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(authorSchema) }}
      />
      <div className="author-box">
        <img src={author.image} alt={author.name} />
        <div>
          <h4>{author.name}</h4>
          <p>{author.bio}</p>
        </div>
      </div>
    </>
  );
}
```

**3. Improve Internal Linking**

```typescript
// Add related posts section
async function getRelatedPosts(currentSlug: string, tags: string[]) {
  const allPosts = await getAllPosts();
  
  return allPosts
    .filter(post => post.slug !== currentSlug)
    .filter(post => post.tags.some(tag => tags.includes(tag)))
    .slice(0, 3);
}

// In blog post template
export default async function BlogPost({ params }) {
  const post = await getPost(params.slug);
  const relatedPosts = await getRelatedPosts(params.slug, post.tags);
  
  return (
    <article>
      {/* Main content */}
      
      <section className="related-posts">
        <h2>Related Articles</h2>
        {relatedPosts.map(related => (
          <a href={`/blog/${related.slug}`} key={related.slug}>
            {related.title}
          </a>
        ))}
      </section>
    </article>
  );
}
```

**4. Request Indexing**

After improvements:

1. GSC > URL Inspection > Enter URL
2. Click "Request Indexing"
3. Wait 1-2 weeks for re-crawl
4. Check status again

**Note:** John Mueller (Google) has said:
> "If you need to manually submit pages for indexing, it hints at quality issues."

The goal is to make content good enough that Google WANTS to index it, not to force indexing.

---

## Issue: "Discovered - currently not indexed"

**Google found your page but hasn't crawled it yet.**

### Root Causes

1. **Low crawl priority** - New/small site, few signals of importance
2. **Crawl budget exhaustion** - Too many low-value pages
3. **Recent discovery** - Just needs time

### Actions

**1. Increase Internal Links**

Link to the page from your most important pages:

```typescript
// In homepage or blog index
<a href="/blog/your-important-post">
  Read: {post.title}
</a>
```

**2. Submit in Sitemap**

Ensure the page is in your sitemap with recent `lastModified`:

```typescript
// app/sitemap.ts
{
  url: 'https://chudi-blog.vercel.app/blog/your-post',
  lastModified: new Date(),  // Today's date signals freshness
  changeFrequency: 'weekly',
  priority: 0.8,  // Higher priority
}
```

**3. Share Externally**

- Post link on social media
- Submit to aggregators (Reddit, HN, relevant communities)
- Get it linked from other sites

**4. Request Indexing**

GSC > URL Inspection > Request Indexing

---

## Monitoring Progress

### Create a Tracking Sheet

| URL | Status | Date Checked | Actions Taken | Next Check |
|-----|--------|--------------|---------------|------------|
| /blog/post-1 | Crawled not indexed | 2024-01-15 | Added content, internal links | 2024-01-29 |
| /blog/post-2 | Discovered | 2024-01-15 | Submitted sitemap | 2024-01-22 |

### Set Up Alerts

```typescript
// scripts/check-indexing.ts
// Run weekly via cron/GitHub Actions

import { google } from 'googleapis';

async function checkIndexingStatus() {
  const auth = await getAuth();
  const searchconsole = google.searchconsole('v1');
  
  // Get all pages from sitemap
  const pages = await getSitemapUrls();
  
  const results = [];
  for (const pageUrl of pages) {
    const inspection = await searchconsole.urlInspection.index.inspect({
      auth,
      requestBody: {
        inspectionUrl: pageUrl,
        siteUrl: 'https://chudi-blog.vercel.app',
      },
    });
    
    results.push({
      url: pageUrl,
      status: inspection.data.inspectionResult?.indexStatusResult?.indexingState,
      lastCrawl: inspection.data.inspectionResult?.indexStatusResult?.lastCrawlTime,
    });
  }
  
  // Alert on non-indexed pages
  const notIndexed = results.filter(r => r.status !== 'INDEXED');
  if (notIndexed.length > 0) {
    console.log('⚠️ Pages not indexed:', notIndexed);
    // Send notification
  }
  
  return results;
}
```

---

## Timeline Expectations

| Action | Expected Impact | Timeline |
|--------|-----------------|----------|
| Fix noindex tag | Page becomes indexable | 1-7 days |
| Submit sitemap | Pages discovered | 1-3 days |
| Request indexing | Page crawled | 1-14 days |
| Content improvements | Indexing decision improved | 2-6 weeks |
| Build backlinks | Authority signals | 1-3 months |

---

## When to Seek Help

If after 4-6 weeks of improvements:
- Pages still show "Crawled - currently not indexed"
- No organic traffic appearing
- GSC shows no improvement

Consider:
1. **SEO audit by professional** - Fresh eyes may spot issues
2. **Content strategy review** - Maybe targeting wrong topics
3. **Technical SEO deep dive** - JavaScript rendering, CDN issues
4. **Backlink building campaign** - Authority signals needed
