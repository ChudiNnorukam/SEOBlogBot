/**
 * Sitemap Monitoring & Alert System
 *
 * Runs as CI/CD cron job to detect issues:
 * - Cache age exceeding thresholds
 * - Domain mismatches
 * - Content validation failures
 *
 * Usage: npm run monitor:sitemap
 * Schedule: Every 1 hour in CI/CD
 */

import type { CheckResult } from '../../lib/types';

interface MonitorAlert {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  action?: string;
}

const THRESHOLDS = {
  cacheStaleHours: 2,
  warningMinutes: 30,
  criticalMinutes: 5
};

export async function monitorSitemap(
  sitemapUrl: string,
  expectedDomain: string,
  onAlert?: (alert: MonitorAlert) => Promise<void>
): Promise<MonitorAlert[]> {
  const alerts: MonitorAlert[] = [];

  try {
    console.log(`🔍 Monitoring sitemap: ${sitemapUrl}`);

    // Fetch sitemap
    const response = await fetch(sitemapUrl, {
      timeout: 10000,
      headers: { 'User-Agent': 'SEOBlogBot-Monitor/1.0' }
    });

    if (!response.ok) {
      const alert: MonitorAlert = {
        severity: 'critical',
        title: 'Sitemap Fetch Failed',
        message: `HTTP ${response.status}: ${response.statusText}`,
        timestamp: new Date().toISOString(),
        action: 'Check Vercel deployment status'
      };
      alerts.push(alert);
      return alerts;
    }

    // Check cache headers
    const age = parseInt(response.headers.get('age') || '0');
    const cacheControl = response.headers.get('cache-control');
    const lastModified = response.headers.get('last-modified');

    // Alert if cache is too old
    const ageHours = age / 3600;
    if (ageHours > THRESHOLDS.cacheStaleHours) {
      const alert: MonitorAlert = {
        severity: 'warning',
        title: 'Stale Sitemap Cache',
        message: `Cache age: ${ageHours.toFixed(1)} hours (>${THRESHOLDS.cacheStaleHours}h threshold)`,
        timestamp: new Date().toISOString(),
        action: 'Force Vercel redeploy: vercel deployments > 3-dot menu > Redeploy'
      };
      alerts.push(alert);
    }

    if (!cacheControl || !cacheControl.includes('max-age')) {
      const alert: MonitorAlert = {
        severity: 'warning',
        title: 'Missing Cache Headers',
        message: 'Sitemap missing cache-control headers',
        timestamp: new Date().toISOString(),
        action: 'Add Cache-Control: max-age=3600, s-maxage=3600 to sitemap route'
      };
      alerts.push(alert);
    }

    // Parse and validate content
    const content = await response.text();
    const urlMatches = content.match(/<loc>([^<]+)<\/loc>/g) || [];
    const urls = urlMatches.map(match => match.replace(/<\/?loc>/g, ''));

    if (urls.length === 0) {
      const alert: MonitorAlert = {
        severity: 'critical',
        title: 'Empty Sitemap',
        message: 'Sitemap contains no URLs',
        timestamp: new Date().toISOString(),
        action: 'Check sitemap generation logic'
      };
      alerts.push(alert);
      return alerts;
    }

    // Check for wrong domain
    if (content.includes('chudi.dev')) {
      const alert: MonitorAlert = {
        severity: 'critical',
        title: 'Wrong Domain in Sitemap',
        message: 'Sitemap contains hardcoded chudi.dev URLs',
        timestamp: new Date().toISOString(),
        action: 'Delete static/sitemap.xml and use dynamic route with request.url.origin'
      };
      alerts.push(alert);

      // Create GitHub issue
      if (onAlert) {
        await onAlert(alert);
      }
    }

    // Check domain match with expected
    if (urls.length > 0) {
      try {
        const firstUrl = new URL(urls[0]);
        if (firstUrl.hostname !== expectedDomain) {
          const alert: MonitorAlert = {
            severity: 'critical',
            title: 'Domain Mismatch',
            message: `URLs have ${firstUrl.hostname} but expected ${expectedDomain}`,
            timestamp: new Date().toISOString(),
            action: 'Verify GSC property matches sitemap domain'
          };
          alerts.push(alert);

          if (onAlert) {
            await onAlert(alert);
          }
        }
      } catch {
        // Invalid URL format
      }
    }

    // Info-level metrics
    alerts.push({
      severity: 'info',
      title: 'Sitemap Stats',
      message: `URLs: ${urls.length}, Cache age: ${age}s, Last modified: ${lastModified || 'unknown'}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const alert: MonitorAlert = {
      severity: 'critical',
      title: 'Monitor Error',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
    alerts.push(alert);
  }

  return alerts;
}

export async function createGitHubIssue(
  token: string,
  owner: string,
  repo: string,
  alert: MonitorAlert
): Promise<void> {
  const issueUrl = `https://api.github.com/repos/${owner}/${repo}/issues`;

  const body = `
## Sitemap Monitoring Alert

**Severity:** ${alert.severity.toUpperCase()}

### Issue
${alert.message}

### Recommended Action
${alert.action || 'No action specified'}

### Detected At
${alert.timestamp}

---
*Generated by SEOBlogBot Sitemap Monitor*
`;

  const response = await fetch(issueUrl, {
    method: 'POST',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: `🚨 ${alert.title}`,
      body,
      labels: ['seo', 'sitemap', `severity-${alert.severity}`]
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to create GitHub issue: ${response.statusText}`);
  }
}

// CLI execution
if (require.main === module) {
  const sitemapUrl = process.argv[2] || 'https://chudi-blog.vercel.app/sitemap.xml';
  const expectedDomain = process.argv[3] || 'chudi-blog.vercel.app';

  monitorSitemap(sitemapUrl, expectedDomain)
    .then(alerts => {
      const critical = alerts.filter(a => a.severity === 'critical');
      const warnings = alerts.filter(a => a.severity === 'warning');
      const info = alerts.filter(a => a.severity === 'info');

      console.log(`\n📊 Sitemap Monitoring Report\n`);

      if (critical.length > 0) {
        console.log('🔴 CRITICAL ALERTS:');
        critical.forEach(a => {
          console.log(`   ${a.title}: ${a.message}`);
          if (a.action) console.log(`   → ${a.action}`);
        });
        console.log('');
      }

      if (warnings.length > 0) {
        console.log('🟡 WARNINGS:');
        warnings.forEach(a => {
          console.log(`   ${a.title}: ${a.message}`);
          if (a.action) console.log(`   → ${a.action}`);
        });
        console.log('');
      }

      if (info.length > 0) {
        console.log('ℹ️  INFO:');
        info.forEach(a => console.log(`   ${a.message}`));
        console.log('');
      }

      process.exit(critical.length > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Monitor error:', error);
      process.exit(1);
    });
}
