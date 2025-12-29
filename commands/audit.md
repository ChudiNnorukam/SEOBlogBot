# Command: /seo audit

**Trigger:** "SEO audit", "check SEO", "analyze SEO", "what's wrong with my SEO"

---

## Overview

The `/seo audit` command runs all 5 validation gates and produces a comprehensive report with prioritized action items.

---

## Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    SEO AUDIT WORKFLOW                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ 1. Determine base URL  │
              │    (production or local)│
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ 2. Run Gate 1:         │
              │    Sitemap & Robots    │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ 3. Run Gate 2:         │
              │    Indexability        │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ 4. Run Gate 3:         │
              │    Meta Tags           │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ 5. Run Gate 4:         │
              │    Canonical URLs      │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ 6. Run Gate 5:         │
              │    Structured Data     │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ 7. Generate Report     │
              │    with priorities     │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ 8. Output actionable   │
              │    fix commands        │
              └────────────────────────┘
```

---

## Running the Audit

### Option 1: Claude Code CLI

```bash
# In project directory
claude "run SEO audit on this blog"

# With specific URL
claude "audit SEO for https://chudi-blog.vercel.app"
```

### Option 2: Direct Script Execution

```bash
# Against production
npx ts-node scripts/seo-preflight.ts https://chudi-blog.vercel.app

# Against local dev
npm run dev &
npx ts-node scripts/seo-preflight.ts http://localhost:3000
```

---

## Sample Output

```
╔═══════════════════════════════════════════════════════════════╗
║   🔍 SEOBLOGBOT PREFLIGHT VALIDATION                          ║
╚═══════════════════════════════════════════════════════════════╝

Target: https://chudi-blog.vercel.app

Gate 1/5: Sitemap Validation...
  ✅ PASSED (234ms)

Gate 2/5: Crawlability...
  ⚠️ WARNING (189ms)

Gate 3/5: Meta Tags...
  ⚠️ WARNING (456ms)

Gate 4/5: Canonical URLs...
  ✅ PASSED (123ms)

Gate 5/5: JSON-LD Schema...
  ⚠️ WARNING (345ms)

═══════════════════════════════════════════════════════════════
PREFLIGHT SUMMARY
═══════════════════════════════════════════════════════════════

Total Checks: 18
  ✅ Passed:   12
  ❌ Failed:   0
  ⚠️  Warnings: 6
  ⏭️  Skipped:  0

⚠️ WARNINGS:

  1. Robots.txt AI Crawlers (LOW)
     GPTBot, ClaudeBot not explicitly allowed
     Fix: Add User-agent rules for AI crawlers

  2. Meta Description Length (MEDIUM)
     Homepage description is 45 chars (recommended: 120-160)
     Fix: Expand meta description with keywords

  3. Blog Posts Missing Descriptions (MEDIUM)
     3/10 blog posts have no meta description
     Affected: /blog/post-1, /blog/post-2, /blog/post-3
     Fix: Add generateMetadata to blog post template

  4. OG Image Missing (MEDIUM)
     Homepage has no og:image defined
     Fix: Add OG image to root layout metadata

  5. JSON-LD Missing Types (LOW)
     Recommended schemas not found: Organization, WebSite
     Fix: Add structured data to homepage

  6. lastmod Missing (MEDIUM)
     Sitemap URLs don't have lastmod dates
     Fix: Add lastModified to sitemap entries

Duration: 1347ms
Result: ✅ PASSED (with warnings)

═══════════════════════════════════════════════════════════════
RECOMMENDED ACTIONS (Priority Order)
═══════════════════════════════════════════════════════════════

1. [MEDIUM] Fix missing meta descriptions
   Run: claude "/seo fix metadata"

2. [MEDIUM] Add OG images
   Run: claude "add OG image to homepage"

3. [MEDIUM] Add lastmod to sitemap
   Run: claude "/seo fix sitemap"

4. [LOW] Add AI crawler permissions
   Run: claude "update robots.txt for AI crawlers"

5. [LOW] Add structured data
   Run: claude "add Organization and WebSite schemas"

Report saved to seo-report.json
```

---

## Understanding Results

### Status Meanings

| Status | Meaning | Action Required |
|--------|---------|-----------------|
| ✅ PASSED | All checks pass | None |
| ⚠️ WARNING | Non-blocking issues | Fix when possible |
| ❌ FAILED | Critical issues | Must fix before deploy |
| ⏭️ SKIPPED | Check couldn't run | Investigate why |

### Severity Levels

| Severity | Impact | Examples |
|----------|--------|----------|
| CRITICAL | Prevents indexing | noindex header, sitemap 500 |
| HIGH | Hurts rankings significantly | Missing canonicals, duplicate content |
| MEDIUM | Affects CTR/rankings | Missing descriptions, no OG images |
| LOW | Nice to have | AI crawler rules, breadcrumbs |

---

## Interpreting Each Gate

### Gate 1: Sitemap & Robots

**What it checks:**
- Sitemap.xml returns 200 with valid XML
- Robots.txt accessible and not blocking everything
- Sitemap referenced in robots.txt
- AI crawlers allowed

**Common issues:**
- CRITICAL: Sitemap returns 500 → See `/seo fix sitemap`
- CRITICAL: Robots blocks all crawlers → Fix robots.txt

### Gate 2: Crawlability

**What it checks:**
- No X-Robots-Tag: noindex header
- AI crawler user agents not blocked
- Resources (CSS, JS) accessible

**Common issues:**
- CRITICAL: noindex on production → See indexability gate
- Middleware blocking crawlers → Add to public routes

### Gate 3: Meta Tags

**What it checks:**
- Title tag present and proper length (50-60 chars)
- Meta description present and proper length (120-160 chars)
- OG tags present (title, description, image)
- Twitter card tags

**Common issues:**
- Missing descriptions → Add generateMetadata
- Title too long → Truncated in SERPs

### Gate 4: Canonical URLs

**What it checks:**
- Canonical link present
- Canonical is self-referencing (matches URL)
- No duplicate canonicals

**Common issues:**
- Missing canonical → Duplicate content risk
- Wrong canonical → Wrong page ranks

### Gate 5: Structured Data

**What it checks:**
- JSON-LD present
- Valid JSON syntax
- @context: https://schema.org
- Required fields for each schema type

**Common issues:**
- No structured data → No rich snippets
- Invalid JSON → Schema ignored

---

## Automated Fix Commands

After audit, use these commands to fix issues:

```bash
# Fix sitemap issues
claude "/seo fix sitemap"

# Fix metadata issues
claude "/seo fix metadata"

# Fix indexing issues
claude "/seo fix indexing"

# Add structured data
claude "add Organization and Article schemas"

# Fix robots.txt
claude "update robots.txt for SEO"
```

---

## CI/CD Integration

Add audit to your build process:

```yaml
# .github/workflows/seo-check.yml
name: SEO Audit
on: [pull_request]

jobs:
  seo-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - run: npm run start &
      - run: npx wait-on http://localhost:3000
      - run: npx ts-node scripts/seo-preflight.ts http://localhost:3000
```

```json
// package.json
{
  "scripts": {
    "seo:audit": "ts-node scripts/seo-preflight.ts",
    "seo:audit:prod": "ts-node scripts/seo-preflight.ts https://chudi-blog.vercel.app",
    "prebuild": "npm run seo:audit || true"  // Warn but don't block
  }
}
```

---

## Comparing Audits Over Time

Track progress by comparing report files:

```bash
# Save dated reports
npx ts-node scripts/seo-preflight.ts https://chudi-blog.vercel.app > seo-report-$(date +%Y%m%d).json

# Compare
diff seo-report-20240115.json seo-report-20240122.json
```

---

## When to Run Audits

| Trigger | Frequency | Focus |
|---------|-----------|-------|
| Pre-deploy | Every deploy | Critical gates only |
| Weekly | Sunday night | Full audit |
| After content changes | As needed | Affected pages |
| After config changes | As needed | Crawlability, indexability |
| Monthly | 1st of month | Full audit + GSC comparison |
