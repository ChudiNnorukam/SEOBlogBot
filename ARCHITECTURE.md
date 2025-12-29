# SEOBlogBot v1.0: Complete Architecture Summary

## Security-First → SEO-First Validation

SEOBlogBot adapts MicroSaaSBot v3's security validation architecture for SEO concerns. The core principle remains: **block deployment if critical issues detected.**

---

## Architecture Mapping: MicroSaaSBot → SEOBlogBot

| MicroSaaSBot v3 Gate | SEOBlogBot Equivalent | What It Protects Against |
|---------------------|----------------------|--------------------------|
| **RLS Validation** | **Schema.org Validation** | Invalid/missing JSON-LD structured data |
| **Webhook Security** | **Sitemap Accessibility** | Unfetchable sitemap blocking discovery |
| **IDOR Detection** | **Canonical URL Verification** | Duplicate content splitting ranking signals |
| **Subscription Enforcement** | **Meta Tag Completeness** | Missing titles/descriptions hurting CTR |
| **Storage Policies** | **Crawlability** | Accidental noindex/robots.txt blocks |

---

## Validation Gates (5 Total)

### Gate 1: Crawlability (CRITICAL)
**Analogy:** Like checking if RLS is enabled—if Google can't access your site, nothing else matters.

| Check | Pass Criteria | Severity |
|-------|---------------|----------|
| Sitemap HTTP 200 | Returns 200 OK | 🛑 CRITICAL |
| Sitemap valid XML | Contains `<urlset>` | 🛑 CRITICAL |
| Sitemap URL count | > 0 URLs | 🛑 CRITICAL |
| Robots.txt accessible | Returns 200 OK | ⚠️ WARNING |
| No blanket Disallow | Not `Disallow: /` | 🛑 CRITICAL |

### Gate 2: Indexability (CRITICAL)
**Analogy:** Like webhook signature verification—ensuring requests aren't blocked by misconfiguration.

| Check | Pass Criteria | Severity |
|-------|---------------|----------|
| No X-Robots-Tag noindex | Header absent on production | 🛑 CRITICAL |
| No meta robots noindex | Tag absent on production | 🛑 CRITICAL |
| *.vercel.app blocked | System URLs have noindex | ⚠️ WARNING |

### Gate 3: Meta Tags (HIGH)
**Analogy:** Like subscription enforcement—ensuring each page has required attributes.

| Check | Pass Criteria | Severity |
|-------|---------------|----------|
| Title present | `<title>` exists | 🛑 CRITICAL |
| Title length | 30-60 characters | ⚠️ WARNING |
| Description present | Meta description exists | 🛑 CRITICAL |
| Description length | 120-160 characters | ⚠️ WARNING |
| OG tags | OpenGraph tags present | ⚠️ WARNING |

### Gate 4: Canonical URLs (HIGH)
**Analogy:** Like IDOR protection—preventing unintended access patterns (duplicate content).

| Check | Pass Criteria | Severity |
|-------|---------------|----------|
| Canonical present | `<link rel="canonical">` on all pages | 🛑 CRITICAL |
| Self-referencing | Points to current URL | ⚠️ WARNING |
| Absolute URL | Full URL, not relative | ⚠️ WARNING |
| HTTPS | Uses secure protocol | ⚠️ WARNING |

### Gate 5: Structured Data (MEDIUM)
**Analogy:** Like RLS policies—ensuring data is properly structured for consumption.

| Check | Pass Criteria | Severity |
|-------|---------------|----------|
| JSON-LD present | At least one schema | ⚠️ WARNING |
| Valid JSON | Parses without errors | 🛑 CRITICAL |
| @context present | `https://schema.org` | 🛑 CRITICAL |
| Article schema | BlogPosting on posts | ⚠️ WARNING |
| Required fields | headline, image, datePublished, author | ⚠️ WARNING |

---

## File Structure

```
~/.claude/skills/seo-blog-bot/
├── SKILL.md                          # Main documentation
├── CLAUDE.md                         # Project context
├── gates/
│   ├── crawlability-gate.md          # Gate 1 details
│   ├── indexability-gate.md          # Gate 2 details
│   ├── metadata-gate.md              # Gate 3 details
│   ├── canonical-gate.md             # Gate 4 details
│   └── structured-data-gate.md       # Gate 5 details
├── commands/
│   ├── audit.md                      # /seo audit workflow
│   ├── fix-sitemap.md                # /seo fix sitemap
│   └── fix-indexing.md               # /seo fix indexing
├── patterns/
│   └── metadata-app-router.md        # Next.js metadata patterns
├── scripts/
│   └── seo-preflight.ts              # Master validation script (793 lines)
├── templates/
│   ├── app-sitemap.ts                # Copy-paste sitemap
│   ├── app-robots.ts                 # Copy-paste robots.txt
│   ├── layout-metadata.tsx           # Root layout metadata
│   └── github-actions-seo.yml        # CI/CD workflow
└── lib/
    └── types.ts                      # TypeScript definitions
```

---

## Build Integration

### Package.json Scripts
```json
{
  "scripts": {
    "seo:audit": "ts-node scripts/seo-preflight.ts",
    "seo:preflight": "ts-node scripts/seo-preflight.ts http://localhost:3000",
    "prebuild": "npm run seo:preflight"
  }
}
```

### GitHub Actions
```yaml
name: SEO Validation
on: [pull_request]

jobs:
  seo-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - run: npm run start &
      - run: npx wait-on http://localhost:3000
      - run: npx ts-node scripts/seo-preflight.ts http://localhost:3000
```

---

## Command Reference

| Command | Trigger | Action |
|---------|---------|--------|
| `/seo audit` | "audit my blog" | Run all 5 gates |
| `/seo fix sitemap` | "sitemap not working" | Generate/fix app/sitemap.ts |
| `/seo fix indexing` | "why not indexed" | Diagnose indexing issues |
| `/seo fix metadata` | "add SEO tags" | Generate metadata configuration |
| `/seo fix schema` | "add structured data" | Generate JSON-LD components |

---

## Issue Pattern Library (12 Patterns)

| ID | Pattern | Severity | Auto-Fix |
|----|---------|----------|----------|
| `SITEMAP_500` | Sitemap returns 5xx | CRITICAL | ✅ Yes |
| `SITEMAP_EMPTY` | Sitemap has 0 URLs | CRITICAL | ✅ Yes |
| `SITEMAP_CACHED` | Stale sitemap served | CRITICAL | ✅ Yes |
| `ROBOTS_BLOCK_ALL` | Disallow: / | CRITICAL | ✅ Yes |
| `NOINDEX_HEADER` | X-Robots-Tag: noindex | CRITICAL | ✅ Yes |
| `NOINDEX_META` | Meta robots noindex | CRITICAL | ✅ Yes |
| `CANONICAL_MISSING` | No canonical tag | CRITICAL | ✅ Yes |
| `CANONICAL_MISMATCH` | Wrong canonical URL | HIGH | ✅ Yes |
| `TITLE_MISSING` | No title tag | CRITICAL | ✅ Yes |
| `DESC_MISSING` | No meta description | HIGH | ✅ Yes |
| `JSONLD_INVALID` | Malformed JSON-LD | HIGH | ✅ Yes |
| `JSONLD_MISSING` | No structured data | MEDIUM | ✅ Yes |

---

## Preflight Output Example

```
╔═══════════════════════════════════════════════════════════════╗
║   🔍 SEOBLOGBOT PREFLIGHT VALIDATION                          ║
╚═══════════════════════════════════════════════════════════════╝

Target: https://chudi-blog.vercel.app

Gate 1/5: Sitemap Validation...
  ✅ PASSED (234ms)

Gate 2/5: Crawlability...
  ✅ PASSED (156ms)

Gate 3/5: Meta Tags...
  ⚠️ WARNING (892ms)

Gate 4/5: Canonical URLs...
  ✅ PASSED (445ms)

Gate 5/5: JSON-LD Schema...
  ⚠️ WARNING (123ms)

═══════════════════════════════════════════════════════════════
PREFLIGHT SUMMARY
═══════════════════════════════════════════════════════════════

Total Checks: 18
  ✅ Passed:   14
  ❌ Failed:   0
  ⚠️  Warnings: 4
  ⏭️  Skipped:  0

Duration: 1850ms
Result: ✅ PASSED (with warnings)
```

---

## Success Metrics

### Before SEOBlogBot

| Metric | Status |
|--------|--------|
| Pages indexed | 1 |
| Sitemap status | "Couldn't fetch" |
| Schema validation | Unknown |
| Meta completeness | Unknown |

### After Implementation

| Metric | Target | Timeline |
|--------|--------|----------|
| Sitemap status | "Success" | 1-3 days |
| Pages indexed | All posts | 2-4 weeks |
| Schema validation | 0 errors | Immediate |
| Meta completeness | 100% | Immediate |

---

## Key Principles (Inherited from MicroSaaSBot v3)

1. **Build-Time Enforcement:** SEO issues caught before deployment, not after Google discovers them.

2. **Gate-Based Validation:** Each gate has clear pass/fail criteria with documented fixes.

3. **Graduated Severity:** CRITICAL blocks deployment; WARNING allows with alerts.

4. **Pattern Library:** Common issues have documented root causes and automated fixes.

5. **CI/CD Integration:** Automated checks on every PR prevent regression.

6. **Manual Override:** Developers can bypass with `--force` flag but must acknowledge risks.

---

## Relationship to MicroSaaSBot

| Aspect | MicroSaaSBot v3 | SEOBlogBot v1 |
|--------|-----------------|---------------|
| Primary concern | Security vulnerabilities | SEO/indexing issues |
| Build block trigger | RLS disabled, IDOR, webhook bypass | Sitemap error, noindex, missing canonical |
| Validation method | Static analysis + runtime checks | HTTP checks + HTML parsing |
| Fix approach | Code generation + DB migrations | Template generation + config fixes |
| Monitoring | Stripe webhooks, subscription status | GSC API, indexing status |

Both follow the same philosophy: **catch issues at build time, not in production.**

---

## Installation

```bash
# Copy skill to Claude Code CLI skills directory
mkdir -p ~/.claude/skills/seo-blog-bot
cp -r /path/to/seoblogbot-skill/* ~/.claude/skills/seo-blog-bot/

# Use in any Next.js blog project
cd ~/your-blog
claude "Read ~/.claude/skills/seo-blog-bot/SKILL.md then audit this blog"
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-12-29 | Initial release with 5 gates, 12 patterns |
