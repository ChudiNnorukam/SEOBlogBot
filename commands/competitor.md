# /seo competitor - Competitor Analysis

## Overview

The `/seo competitor` command analyzes competitor websites to identify SEO opportunities and gaps.

## Usage

```bash
# Analyze a competitor's SEO setup
claude "/seo competitor analyze https://competitor.com"

# Compare your site with competitors
claude "/seo competitor compare https://competitor1.com https://competitor2.com"

# Keyword gap analysis
claude "/seo competitor keywords https://competitor.com"

# Content gap analysis
claude "/seo competitor content https://competitor.com"
```

## Analysis Types

### 1. Site Analysis (`/seo competitor analyze`)

Analyzes a competitor's SEO setup:

**Technical SEO:**
- Sitemap structure and URL count
- Robots.txt configuration
- Page speed (TTFB, load time)
- Mobile friendliness

**On-Page SEO:**
- Title tag patterns
- Meta description patterns
- Header structure (H1, H2, H3)
- Internal linking patterns

**Structured Data:**
- Schema types used
- JSON-LD implementation
- Rich snippet eligibility

**Output:**
```
╔═══════════════════════════════════════════════════════════════╗
║   Competitor Analysis: competitor.com                          ║
╚═══════════════════════════════════════════════════════════════╝

Technical SEO
  Sitemap URLs:     156
  TTFB:             245ms (excellent)
  Page Size:        1.2MB

On-Page Patterns
  Title Format:     "[Topic] - Complete Guide | BrandName"
  Title Length:     45-55 characters (optimal)
  Description:      Action-oriented, includes CTAs

Schema Implementation
  ✅ Organization
  ✅ WebSite with SearchAction
  ✅ BlogPosting on articles
  ✅ BreadcrumbList

Opportunities
  • They rank for "topic keyword" - you should too
  • They have FAQ schema - adds featured snippets
  • Their articles average 2,500 words - yours average 1,200
```

### 2. Keyword Gap Analysis (`/seo competitor keywords`)

Identifies keywords competitors rank for that you don't:

**Process:**
1. Fetches competitor's indexed pages from sitemap
2. Extracts keywords from titles, headings, content
3. Compares with your site's content
4. Identifies gaps and opportunities

**Output:**
```
Keyword Gap Analysis
═══════════════════════════════════════════════════════════════

High Priority (they rank, you don't):
  • "keyword phrase 1" - appears in 5 of their articles
  • "keyword phrase 2" - appears in 3 of their articles

Content Ideas:
  • Create article: "Topic they cover that you don't"
  • Expand existing: "Your article missing subtopic"
```

### 3. Content Gap Analysis (`/seo competitor content`)

Compares content strategy:

**Metrics:**
- Number of articles
- Publishing frequency
- Content depth (word count)
- Topic coverage
- Content formats (guides, tutorials, comparisons)

**Output:**
```
Content Gap Analysis
═══════════════════════════════════════════════════════════════

Your Site          Competitor
50 articles        156 articles
2x/month          8x/month
1,200 avg words    2,500 avg words

Missing Topics:
  • They have guides on: X, Y, Z
  • They have comparison posts: "A vs B"
  • They have "ultimate guide" format

Recommendations:
  • Increase publishing frequency
  • Create comprehensive guides
  • Add comparison content
```

### 4. Schema Comparison

Compares structured data implementation:

```
Schema Comparison
═══════════════════════════════════════════════════════════════

                    Your Site    Competitor
Organization        ✅           ✅
WebSite            ❌           ✅
BreadcrumbList     ❌           ✅
BlogPosting        ✅           ✅
FAQPage            ❌           ✅
HowTo              ❌           ✅

Recommended additions:
  • WebSite schema with SearchAction
  • BreadcrumbList for navigation
  • FAQPage for FAQ sections
  • HowTo for tutorial content
```

## Implementation Notes

### Data Sources

This command uses:
1. Direct HTTP requests to competitor sites
2. Sitemap parsing for content inventory
3. HTML parsing for meta tags and structure
4. Comparison with your site's data

### Limitations

- Cannot access private/authenticated content
- Cannot get exact keyword rankings (would need SEMrush/Ahrefs API)
- Cannot analyze paid/advertising strategies
- Rate-limited to avoid overloading competitor servers

### Ethical Use

- This is for competitive research, not scraping
- Respect robots.txt of competitor sites
- Don't overload their servers with requests
- Use insights to improve your own site, not copy content

## Integration with Audit

```bash
# Full competitive audit workflow
claude "/seo audit https://your-site.com"
claude "/seo competitor analyze https://competitor1.com"
claude "/seo competitor analyze https://competitor2.com"
claude "/seo competitor keywords https://competitor1.com"
```

## Advanced Usage

### Multi-Competitor Comparison

```bash
claude "Compare my site's SEO with these 3 competitors:
- https://competitor1.com
- https://competitor2.com
- https://competitor3.com

Focus on:
1. Technical SEO differences
2. Content strategy gaps
3. Schema opportunities"
```

### Specific Aspect Analysis

```bash
claude "/seo competitor analyze https://competitor.com --focus schema"
claude "/seo competitor analyze https://competitor.com --focus speed"
claude "/seo competitor analyze https://competitor.com --focus content"
```
