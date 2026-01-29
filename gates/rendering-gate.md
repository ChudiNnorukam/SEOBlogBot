# Gate: Rendering Parity

**Severity:** WARNING
**Purpose:** Detects pages where critical content is only visible after JavaScript rendering.

---

## What This Gate Validates

| Check | Severity | Pass Criteria |
|-------|----------|---------------|
| Rendered vs HTML Parity | MEDIUM | Rendered text is not significantly larger than raw HTML |

---

## Why This Matters

Google can render JavaScript, but rendering is deferred and resource-limited. If critical content only appears after JS execution, it can reduce crawl efficiency and indexing quality.

---

## Validation Script

```typescript
// scripts/validators/validate-rendering.ts
// Uses Playwright if installed; otherwise returns a warning.
```

---

## Manual Verification

```bash
# Compare raw HTML vs rendered content
curl https://your-site.com | wc -w
# Use browser devtools > Elements > Copy innerText to compare
```
