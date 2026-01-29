# SEO Research Notes to Improve SEOBlogBot

Date: 2026-01-01
Purpose: Synthesize authoritative SEO guidance, industry frameworks, key terms, and schema requirements into a concrete backlog for SEOBlogBot.

## 1) Fundamental Frameworks (Authoritative)

A. Search Essentials (Google)
- Google emphasizes technical requirements (crawlability/indexability), spam policies, and best practices as the baseline for visibility. Treat these as the top-level gate categories for any SEO audit. [1]

B. Crawling and Indexing Lifecycle
- Crawlability and indexability are separate concerns; troubleshooting should distinguish fetching issues vs indexing decisions. [2]
- Sitemaps and robots.txt are first-order crawl signals; Search Console is the canonical debugging UI. [2][6]

C. Sitemaps Requirements
- A sitemap file is limited to 50,000 URLs and 50MB uncompressed. [3]
- Sitemaps should be UTF-8 encoded; location matters (sitemaps only cover URLs under their directory unless submitted in Search Console). [3]

D. Robots.txt Standard (REP)
- Robots rules are matched by user-agent group, longest specific user-agent wins, then longest path rule wins with Allow beating Disallow when equal length. [4]
- Google documents a 500 KiB robots.txt file size limit. [4]

E. Canonicalization Signals (Industry Consensus)
- Canonical tags are one signal among redirects, internal links, sitemap entries, and consistent URL structure. [13]

F. Core Web Vitals
- LCP/INP/CLS thresholds are used in Google reporting and should be monitored as part of technical SEO health. [8]

G. Mobile-First Indexing
- Google uses the mobile version for indexing; content and metadata parity between mobile and desktop is critical. [7]

H. JavaScript Rendering Guidance
- Dynamic rendering is a workaround for content that is not easily renderable by crawlers; SSR or static rendering remains preferred. [10]

I. Internationalization / hreflang
- Multi-regional or multilingual sites should use hreflang annotations to map regional/language variants. [9]

## 2) Structured Data and Schema Focus Areas

Google Structured Data Guidelines
- Structured data must match visible content and follow schema rules; violations can trigger manual actions or rich result ineligibility. [5]

High-impact schema types for blogs (Google supported)
- Article / BlogPosting for posts. [11]
- Organization for brand identity. [12]
- BreadcrumbList for navigation context. [14]

Practical schema checks to add
- Verify required properties for supported rich results types.
- Validate schema against policies (content visible, no misleading claims).
- Ensure JSON-LD is present on mobile and matches desktop markup. [5][7]

## 3) Professional Skill Sets and Key Terms (Industry)

Core skill clusters to map in bot outputs
- Technical SEO: crawl/index troubleshooting, robots/sitemaps, canonicalization, site architecture. [2][3][4]
- On-page SEO: titles, descriptions, headings, internal links, structured data. [1][5]
- Performance: CWV monitoring, caching, responsiveness. [8]
- Internationalization: hreflang and regional targeting. [9]
- Reporting and diagnostics: Search Console reports and URL Inspection. [6][15]

Key terms to include in bot glossary (definitions should align with authoritative sources)
- Crawl budget, indexing status, canonicalization, CWV metrics, URL inspection, rich results. [2][8][15]

Industry frameworks / checklists to align with
- Semrush technical SEO checklist (coverage of crawlability, HTTPS, canonicals, duplicate content, sitemap health). [16]
- Ahrefs technical SEO guide (emphasis on canonicalization signals and internal linking). [13]

## 4) Recommended Feature Updates for SEOBlogBot

Priority 0 (High-impact, Google-aligned)
1) Search Console integration (URL Inspection API)
   - Surface indexing state, last crawl time, canonical as seen by Google, rich results presence. [15]
   - Add a new tool: check-indexing-status-batch (batch URL inspection).

2) Full robots.txt REP parsing and per-URL evaluation
   - Enforce 500 KiB limit, longest-match allow/disallow behavior, user-agent selection. [4]
   - Expand robots coverage beyond blanket block and AI crawler rules.

3) Sitemap coverage upgrades
   - Enforce UTF-8 encoding and location scope rules. [3]
   - Fail when sitemap includes URLs outside its directory scope (unless submitted in GSC). [3]

Priority 1 (Mobile-first and parity)
4) Mobile parity validation
   - Compare mobile vs desktop: title, description, canonical, robots meta, and structured data. [7][5]

5) Rendered vs HTML content check (JS rendering risk)
   - Detect when critical content is missing from HTML and likely loaded via JS only. [10]

Priority 2 (Content quality and internal architecture)
6) Internal linking graph and orphan detection
   - Use crawl graph to detect orphan pages and thin internal linking (industry best practice). [13][16]

7) Duplicate content heuristics
   - Hash-based near-duplicate detection across crawled pages; warn when canonical is missing or inconsistent. [13]

Priority 3 (Structured data quality)
8) Rich Results coverage
   - Validate required properties for Article/Organization/BreadcrumbList types. [11][12][14]
   - Add policy checks for visible content alignment. [5]

## 5) Implementation Notes for SEOBlogBot

Suggested tool additions
- /seo gsc: URL inspection + coverage summary via Search Console API. [15]
- /seo robots: REP-compliant evaluation of specific URLs with allow/disallow traces. [4]
- /seo render-diff: compare raw HTML vs rendered DOM text to flag JS-only content. [10]

New gate proposals
- Gate: Internationalization (hreflang and x-default validation). [9]
- Gate: Mobile Parity (metadata + structured data + content parity). [7][5]

## References
[1] https://developers.google.com/search/docs/essentials
[2] https://developers.google.com/search/docs/crawling-indexing/overview
[3] https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
[4] https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt
[5] https://developers.google.com/search/docs/appearance/structured-data/sd-policies
[6] https://support.google.com/webmasters/answer/1291841
[7] https://developers.google.com/search/docs/crawling-indexing/mobile-sites-mobile-first-indexing
[8] https://developers.google.com/search/docs/appearance/core-web-vitals
[9] https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
[10] https://developers.google.com/search/docs/crawling-indexing/dynamic-rendering
[11] https://developers.google.com/search/docs/appearance/structured-data/article
[12] https://developers.google.com/search/docs/appearance/structured-data/organization
[13] https://ahrefs.com/blog/technical-seo/
[14] https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
[15] https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect
[16] https://www.semrush.com/blog/technical-seo-checklist/
