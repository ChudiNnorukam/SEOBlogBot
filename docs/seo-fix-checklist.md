# SEO 10/10 Fix Checklist (Implementation Guide)

Project: chudi-blog.vercel.app
Date: 2026-01-02
Owner: TBD

## 0) Preconditions
- [ ] Confirm framework/runtime (SvelteKit per footer) and repo location.
- [ ] Confirm production domain and canonical base URL.
- [ ] Confirm deployment platform (Vercel/Netlify/etc.).

## 1) Indexability & Discoverability (P0)

### 1.1 Sitemap
- [ ] Ensure `/sitemap.xml` returns 200 for all user agents.
- [ ] Ensure Content-Type is `application/xml`.
- [ ] Validate 50k URLs / 50MB size limits.
- [ ] Include **all** key routes: blog posts, portfolio, products, resources.
- [ ] Ensure `lastmod` present for every URL.

**Suggested files (SvelteKit):**
- `src/routes/sitemap.xml/+server.ts`
- `src/lib/server/sitemap.ts` (helper)

### 1.2 Robots
- [ ] Ensure `/robots.txt` returns 200 and does not block `/blog`, `/portfolio`, `/resources`, `/products`.
- [ ] Add `Sitemap:` directive pointing to `/sitemap.xml`.
- [ ] Allow major bots + AI crawlers (optional for AEO).

**Suggested files (SvelteKit):**
- `src/routes/robots.txt/+server.ts`

### 1.3 RSS
- [ ] Ensure `/rss.xml` returns 200 with valid RSS XML.
- [ ] Content-Type: `application/rss+xml` or `application/xml`.
- [ ] Include `<channel>` + `<item>` with required fields.

**Suggested files (SvelteKit):**
- `src/routes/rss.xml/+server.ts`
- `src/lib/server/rss.ts` (helper)

### 1.4 Search Console
- [ ] Verify property for canonical domain.
- [ ] Submit sitemap.
- [ ] Inspect top 10 URLs; confirm Indexing = Indexed.

---

## 2) On‑Page SEO (P1)

### 2.1 Titles and Descriptions
- [ ] Titles: 50–60 chars, unique per page.
- [ ] Descriptions: 120–160 chars.
- [ ] Ensure OpenGraph + Twitter meta present.

**Suggested files (SvelteKit):**
- `src/routes/+layout.svelte` or `src/lib/seo.ts` (central metadata)
- Per‑page `load()` or `+page.server.ts` for dynamic meta

### 2.2 Headings / TOC
- [ ] Ensure headings are real `<h2>/<h3>`.
- [ ] Add stable IDs for anchor links.
- [ ] TOC should detect headings.

### 2.3 Thin Content Fixes
- [ ] Expand About / Resources / thin portfolio pages to ≥300 words.
- [ ] Add FAQs and internal links to pillar pages.

---

## 3) AEO + Structured Data (P2)

### 3.1 Schema Coverage
- [ ] Blog posts: `BlogPosting` with headline, author, datePublished, image, description.
- [ ] Portfolio pages: `CreativeWork` or `SoftwareApplication`.
- [ ] Site-wide: `Person` + `Organization` + `BreadcrumbList`.

**Suggested files:**
- `src/lib/seo/schema.ts`
- Per‑page JSON‑LD injection in `+page.svelte` or layout.

### 3.2 Answer‑Friendly Formatting
- [ ] TL;DR + Key Takeaways near top.
- [ ] FAQ block on Home + key portfolio pages.

---

## 4) Performance + Lighthouse (P3)

### 4.1 Lighthouse
- [ ] Run Lighthouse (mobile) with PSI key.
- [ ] Target scores ≥90 across Performance, SEO, Best Practices, Accessibility, PWA.

### 4.2 Common Fixes
- [ ] Optimize images (WebP/AVIF).
- [ ] Reduce JS bundle.
- [ ] Cache static assets.
- [ ] Fix CLS with explicit sizes.

---

## 5) Authority Expansion (P4)

- [ ] Create 2–3 pillar pages targeting primary search themes.
- [ ] Link posts → pillar pages → portfolio → products.

---

## Verification
- [ ] Run SEOBlogBot crawl with `--crawl`.
- [ ] Verify no warnings in sitemap/robots/meta/schema gates.
- [ ] Lighthouse ≥90 all categories.
- [ ] GSC URL Inspection: Indexed.
