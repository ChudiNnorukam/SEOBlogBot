// scripts/validators/validate-crawlability.ts
// Robots.txt and crawlability validation module

import type { CheckResult } from '../../lib/types';
import { parseRobotsTxt, pickRobotsGroup, evaluateRobotsRules } from '../utils/robots';

export interface CrawlabilityValidatorOptions {
  baseUrl: string;
  userAgent?: string;
  timeout?: number;
}

export interface RobotsAnalysis {
  accessible: boolean;
  statusCode: number;
  hasSitemapDirective: boolean;
  hasBlanketBlock: boolean;
  blockedAICrawlers: string[];
  allowedPaths: string[];
  disallowedPaths: string[];
}

const AI_CRAWLERS = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'ChatGPT-User', 'Google-Extended'];
const MAX_ROBOTS_SIZE_BYTES = 500 * 1024;
const ROBOTS_TEST_USER_AGENT = 'Googlebot';

/**
 * Validate robots.txt and crawlability
 */
export async function validateCrawlability(options: CrawlabilityValidatorOptions): Promise<{
  checks: CheckResult[];
  analysis: RobotsAnalysis;
}> {
  const { baseUrl, userAgent = 'SEOBlogBot/1.1', timeout = 10000 } = options;
  const robotsUrl = `${baseUrl}/robots.txt`;
  const checks: CheckResult[] = [];

  const analysis: RobotsAnalysis = {
    accessible: false,
    statusCode: 0,
    hasSitemapDirective: false,
    hasBlanketBlock: false,
    blockedAICrawlers: [],
    allowedPaths: [],
    disallowedPaths: [],
  };

  try {
    // Check robots.txt
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(robotsUrl, {
      headers: { 'User-Agent': userAgent },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    analysis.statusCode = response.status;

    if (!response.ok) {
      checks.push({
        name: 'Robots.txt Status',
        status: 'WARNING',
        severity: 'MEDIUM',
        message: `Robots.txt returned ${response.status}`,
        fix: 'Create app/robots.ts using the template',
      });
    } else {
      analysis.accessible = true;
      checks.push({
        name: 'Robots.txt Status',
        status: 'PASSED',
        severity: 'MEDIUM',
      });

      const text = await response.text();
      const robotsSizeBytes = Buffer.byteLength(text, 'utf8');

      if (robotsSizeBytes > MAX_ROBOTS_SIZE_BYTES) {
        checks.push({
          name: 'Robots.txt File Size',
          status: 'WARNING',
          severity: 'MEDIUM',
          message: `robots.txt is ${(robotsSizeBytes / 1024).toFixed(1)}KB (Google limit is 500KB)`,
          fix: 'Reduce robots.txt size to <= 500KB',
        });
      } else {
        checks.push({
          name: 'Robots.txt File Size',
          status: 'PASSED',
          severity: 'LOW',
          message: `${(robotsSizeBytes / 1024).toFixed(1)}KB`,
        });
      }

      // Check for blanket block
      const lines = text.split('\n').map(l => l.trim());
      let currentUserAgent = '';

      for (const line of lines) {
        if (line.toLowerCase().startsWith('user-agent:')) {
          currentUserAgent = line.split(':')[1]?.trim() || '';
        } else if (line.toLowerCase().startsWith('disallow:')) {
          const path = line.split(':')[1]?.trim() || '';
          analysis.disallowedPaths.push(`${currentUserAgent}: ${path}`);
        } else if (line.toLowerCase().startsWith('allow:')) {
          const path = line.split(':')[1]?.trim() || '';
          analysis.allowedPaths.push(`${currentUserAgent}: ${path}`);
        } else if (line.toLowerCase().startsWith('sitemap:')) {
          analysis.hasSitemapDirective = true;
        }
      }

      const groups = parseRobotsTxt(text);
      const group = pickRobotsGroup(ROBOTS_TEST_USER_AGENT, groups) ?? pickRobotsGroup('*', groups);
      if (group) {
        const ruleCheck = evaluateRobotsRules('/', group.rules);
        if (!ruleCheck.allowed) {
          analysis.hasBlanketBlock = true;
        }
      }

      // Check for blanket block
      if (analysis.hasBlanketBlock) {
        checks.push({
          name: 'Robots.txt Blanket Block',
          status: 'FAILED',
          severity: 'CRITICAL',
          message: 'Robots.txt is blocking all crawlers with Disallow: /',
          fix: 'Change "Disallow: /" to "Disallow: /api/" or similar',
        });
      } else {
        checks.push({
          name: 'Robots.txt Blanket Block',
          status: 'PASSED',
          severity: 'CRITICAL',
          message: 'No blanket block detected',
        });
      }

      // Check for sitemap reference
      if (analysis.hasSitemapDirective) {
        checks.push({
          name: 'Robots.txt Sitemap Reference',
          status: 'PASSED',
          severity: 'MEDIUM',
        });
      } else {
        checks.push({
          name: 'Robots.txt Sitemap Reference',
          status: 'WARNING',
          severity: 'MEDIUM',
          message: 'No Sitemap directive in robots.txt',
          fix: 'Add "Sitemap: https://yoursite.com/sitemap.xml"',
        });
      }

      // Check AI crawler access
      for (const crawler of AI_CRAWLERS) {
        const crawlerSection = text.match(
          new RegExp(`User-agent:\\s*${crawler}[\\s\\S]*?(?=User-agent:|$)`, 'i')
        );
        if (crawlerSection && crawlerSection[0].toLowerCase().includes('disallow: /')) {
          analysis.blockedAICrawlers.push(crawler);
        }
      }

      if (analysis.blockedAICrawlers.length > 0) {
        checks.push({
          name: 'AI Crawler Access',
          status: 'WARNING',
          severity: 'LOW',
          message: `Blocking AI crawlers: ${analysis.blockedAICrawlers.join(', ')}`,
          fix: 'Consider allowing AI crawlers for AEO visibility',
          details: { blockedCrawlers: analysis.blockedAICrawlers },
        });
      } else {
        checks.push({
          name: 'AI Crawler Access',
          status: 'PASSED',
          severity: 'LOW',
          message: 'AI crawlers not explicitly blocked',
        });
      }
    }

    // Check X-Robots-Tag header on homepage
    const homeController = new AbortController();
    const homeTimeoutId = setTimeout(() => homeController.abort(), timeout);

    const homeResponse = await fetch(baseUrl, {
      headers: { 'User-Agent': userAgent },
      signal: homeController.signal,
    });

    clearTimeout(homeTimeoutId);
    const xRobotsTag = homeResponse.headers.get('x-robots-tag');

    if (xRobotsTag?.toLowerCase().includes('noindex')) {
      checks.push({
        name: 'X-Robots-Tag Header',
        status: 'FAILED',
        severity: 'CRITICAL',
        message: `noindex found in X-Robots-Tag: ${xRobotsTag}`,
        fix: 'Remove noindex header in next.config.js or Vercel settings',
      });
    } else {
      checks.push({
        name: 'X-Robots-Tag Header',
        status: 'PASSED',
        severity: 'CRITICAL',
        message: xRobotsTag || 'No X-Robots-Tag header (good)',
      });
    }

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      checks.push({
        name: 'Crawlability Check',
        status: 'FAILED',
        severity: 'HIGH',
        message: `Request timed out after ${timeout}ms`,
      });
    } else {
      checks.push({
        name: 'Crawlability Check',
        status: 'FAILED',
        severity: 'CRITICAL',
        message: error instanceof Error ? error.message : 'Failed to check crawlability',
      });
    }
  }

  return { checks, analysis };
}

export type { CrawlabilityValidatorOptions, RobotsAnalysis };
