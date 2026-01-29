# Gate: Lighthouse Checklist

**Severity:** WARNING
**Purpose:** Surfaced Lighthouse category scores and top failing audits (Performance, Accessibility, Best Practices, SEO, PWA).

---

## What This Gate Validates

| Check | Severity | Pass Criteria |
|-------|----------|---------------|
| Lighthouse Performance | HIGH | Score >= 90 |
| Lighthouse Accessibility | MEDIUM | Score >= 90 |
| Lighthouse Best Practices | MEDIUM | Score >= 90 |
| Lighthouse SEO | HIGH | Score >= 90 |
| Lighthouse PWA | LOW | Score >= 90 |
| Lighthouse Top Issues | MEDIUM | No major audits below 90 |

---

## Notes

- Uses PageSpeed Insights API (Lighthouse in the cloud).\n- If the API is unavailable, the gate warns but does not block deployment.\n- Scores below 50 are flagged as warnings for visibility, not blockers.
