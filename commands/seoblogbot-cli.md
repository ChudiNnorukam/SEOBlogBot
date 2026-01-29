# Skill: SEOBlogBot CLI Integration

**Registration Name:** `seoblogbot`
**Access:** `/seoblogbot [command] [target-url]`

---

## Available Commands

### 1. Validate Sitemap Conflicts
```bash
/seoblogbot validate-conflicts https://your-site.com/sitemap.xml
```

**What it does:**
- Detects static vs dynamic sitemap conflicts
- Validates domain matches GSC property
- Checks cache age and headers
- Identifies hardcoded URLs (chudi.dev, etc.)

**Example Output:**
```
❌ Domain mismatch: Sitemap has 'chudi.dev' but expected 'chudi-blog.vercel.app'
   → Delete static/sitemap.xml
   → Use request.url.origin instead of hardcoded domain

💡 Recommendations:
   - Update sitemap to use dynamic origin
   - Run: npm run validate:sitemap-conflicts
```

### 2. Monitor Sitemap Health
```bash
/seoblogbot monitor https://your-site.com/sitemap.xml
```

**What it does:**
- Runs continuous health checks
- Alerts on stale cache (>2 hours)
- Detects domain mismatches
- Creates GitHub issues for critical alerts

**Scheduled:** Every 1 hour in CI/CD

### 3. Audit SEO (Full)
```bash
/seoblogbot audit https://your-site.com
```

**What it does:**
- Complete SEO audit (meta, schema, performance, crawlability)
- Checks robot.txt compatibility
- Validates structured data
- Generates SEO report

### 4. Quick Verify
```bash
/seoblogbot verify
```

**What it does:**
- TypeScript type checking
- Sitemap conflict validation
- Pre-commit hook verification
- Ready-to-commit check

---

## Integration with Claude Code

### Setup (One-time)

1. **Clone SEOBlogBot:**
```bash
git clone https://github.com/ChudiNnorukam/SEOBlogBot ~/Projects/SEOBlogBot
cd ~/Projects/SEOBlogBot
npm install
npm run build
```

2. **Add to Claude Code config** (`~/.claude/CLAUDE.md`):
```markdown
## SEOBlogBot Integration

Run SEOBlogBot commands from Claude Code:

\`\`\`bash
# Validate sitemap
/seoblogbot validate-conflicts https://chudi-blog.vercel.app

# Monitor health
/seoblogbot monitor https://chudi-blog.vercel.app

# Full audit
/seoblogbot audit https://chudi-blog.vercel.app

# Pre-commit check
/seoblogbot verify
\`\`\`

Install: ~/Projects/SEOBlogBot
```

### Usage in Claude Code

**From any conversation:**
```
/seoblogbot validate-conflicts https://your-site.com/sitemap.xml
```

**Before committing:**
```bash
# In Claude Code
/seoblogbot verify
```

---

## Key Features

### ✅ Automatic Issue Detection
- Conflicting static/dynamic sitemaps
- Hardcoded domain URLs
- Stale cache issues
- URL domain mismatches
- Missing cache headers

### ✅ Pre-Commit Protection
- Prevents commits with sitemap conflicts
- Validates configuration integrity
- Type checks before deployment

### ✅ Monitoring & Alerts
- 1-hour interval health checks
- GitHub issue creation on critical alerts
- Cache age tracking
- Domain mismatch notifications

### ✅ Integration with chudi-blog

The fixes in this session were specifically designed to prevent sitemap issues:

| Issue | Prevention | Tool |
|-------|-----------|------|
| Stale cache (127hrs) | Monitor cache age | `/seoblogbot monitor` |
| Wrong domain (chudi.dev) | Validate domain match | `/seoblogbot validate-conflicts` |
| Static override | Detect conflicts | `/seoblogbot validate-conflicts` |
| Regeneration loop | Gate with pre-commit | `.husky/pre-commit` |

---

## Configuration

### Environment Variables

```bash
# .env (in SEOBlogBot root)
GITHUB_TOKEN=xxx          # For creating issues on alerts
GITHUB_OWNER=ChudiNnorukam
GITHUB_REPO=chudi-blog

# Thresholds
CACHE_STALE_HOURS=2       # Alert if cache > 2 hours
ALERT_CRITICAL_MINUTES=5  # Create GitHub issue if >5 min cache
```

### Customize for Your Site

Edit `/scripts/validators/validate-sitemap-conflicts.ts`:

```typescript
// Update these values for your domain
const THRESHOLDS = {
  cacheStaleHours: 2,       // ← Adjust threshold
  warningMinutes: 30,
  criticalMinutes: 5
};

// In CLI, pass your domain:
/seoblogbot validate-conflicts https://your-domain.com/sitemap.xml
```

---

## Troubleshooting

### "Sitemap contains hardcoded chudi.dev"
```bash
# Fix for Next.js App Router:
# Use dynamic origin in route handler

// src/routes/sitemap.xml/+server.ts
export async function GET({ request }: { request: Request }) {
  const origin = new URL(request.url).origin; // ← Uses actual domain
  // URLs will now use request domain, not hardcoded
}

# Verify fix:
/seoblogbot validate-conflicts https://your-site.com/sitemap.xml
```

### "Both static and dynamic sitemap exist"
```bash
# Delete static file and clean cache:
rm static/sitemap.xml
npm run validate:sitemap-conflicts

# Force Vercel redeploy to clear edge cache
```

### "Cache age > 2 hours"
```bash
# Trigger edge cache refresh:
# Option 1: Redeploy via Vercel dashboard
# Option 2: Run /seoblogbot monitor to auto-create GitHub issue
# Option 3: Update vercel.json cache headers
```

---

## Automation

### GitHub Actions Integration

```yaml
# .github/workflows/sitemap-monitor.yml
name: SEOBlogBot Sitemap Monitor

on:
  schedule:
    - cron: '0 * * * *'  # Every hour

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - run: cd ~/Projects/SEOBlogBot && npm install
      - run: npm run monitor:sitemap -- https://your-site.com/sitemap.xml
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Status Dashboard

Track sitemap health:

```bash
# View current status
/seoblogbot monitor https://your-site.com

# Expected healthy output:
✅ Sitemap configuration healthy
   - URLs: 108
   - Cache age: 12s (fresh)
   - Domain: chudi-blog.vercel.app (matches GSC)
   - Last modified: 2026-01-09T15:47:14Z
```

---

## Next Steps

1. **Setup:** Run `/seoblogbot verify` to validate your installation
2. **Test:** Run `/seoblogbot validate-conflicts https://your-site.com`
3. **Monitor:** Enable hourly checks with `/seoblogbot monitor`
4. **Integrate:** Add to pre-commit hooks via `.husky/pre-commit`

For detailed docs: `~/Projects/SEOBlogBot/README.md`
