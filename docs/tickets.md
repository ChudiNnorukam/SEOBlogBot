# SEOBlogBot Follow-up Tickets

Date: 2026-01-01
Owner: TBD

## SEO-001: Enable Playwright in CI and local installs
- Priority: P1
- Problem: Rendering parity gate warns when Playwright is missing.
- Acceptance:
  - Add Playwright (or Playwright-core + browser install) to dependencies.
  - Document install command and CI setup.
  - Rendering gate runs without warnings on supported environments.

## SEO-002: Robots REP parser test suite
- Priority: P1
- Problem: No automated coverage for robots.txt precedence and user-agent matching.
- Acceptance:
  - Unit tests for longest user-agent match.
  - Unit tests for longest rule match and Allow precedence.
  - Unit tests for wildcard and end-of-line ($) behavior.

## SEO-003: Sitemap validation test suite
- Priority: P1
- Problem: New sitemap checks are untested (encoding, size, scope, blocked URLs).
- Acceptance:
  - Fixtures for UTF-8 vs non-UTF-8 sitemaps.
  - Coverage for 50,000 URL limit and 50MB size check.
  - Coverage for URL scope violations and robots.txt blocked URLs.

## SEO-004: Schema validation coverage
- Priority: P2
- Problem: New schema requirements and policy warnings need tests.
- Acceptance:
  - Article/BlogPosting recommended fields coverage.
  - BreadcrumbList itemListElement structure tests.
  - Policy warning tests for visible-content mismatch.

## SEO-005: Mobile parity on multi-page crawl
- Priority: P2
- Problem: Mobile parity checks run only on homepage.
- Acceptance:
  - Add optional flag to fetch mobile HTML for each crawled page.
  - Report per-page mobile parity in crawl summary.

## SEO-006: GSC batch quota protection
- Priority: P2
- Problem: Batch tool can exhaust API quota quickly.
- Acceptance:
  - Add rate limiting or delay between requests.
  - Add optional caching for repeated URLs.
  - Add warning when request count approaches quota.

## SEO-007: Lighthouse checklist tuning
- Priority: P2
- Problem: Lighthouse checklist thresholds and issue selection may need tuning per project.
- Acceptance:
  - Allow configurable thresholds per category.
  - Allow limiting audits by category or score threshold.
  - Add caching to avoid repeated PSI calls.
