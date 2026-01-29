// scripts/validators/validate-rendering.ts
// Rendered vs HTML content parity (JS rendering risk)

import type { CheckResult } from '../../lib/types';
import { createRequire } from 'node:module';

export interface RenderingValidatorOptions {
  url: string;
  userAgent?: string;
  timeout?: number;
}

const DEFAULT_USER_AGENT = 'SEOBlogBot/1.1';

const extractVisibleText = (html: string): string => {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
};

const countWords = (text: string): number =>
  text.split(' ').filter((word) => word.length > 0).length;

export async function validateRendering(options: RenderingValidatorOptions): Promise<{
  checks: CheckResult[];
}> {
  const { url, userAgent = DEFAULT_USER_AGENT, timeout = 15000 } = options;
  const checks: CheckResult[] = [];

  const require = createRequire(import.meta.url);
  let playwright: any;
  try {
    playwright = require('playwright');
  } catch {
    checks.push({
      name: 'Rendered Content Parity',
      status: 'WARNING',
      severity: 'MEDIUM',
      message: 'Playwright not installed; rendering parity check skipped',
      fix: 'Install Playwright to enable rendered vs HTML checks',
    });
    return { checks };
  }

  let rawHtml = '';
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(url, {
      headers: { 'User-Agent': userAgent },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    rawHtml = await response.text();
  } catch (error) {
    checks.push({
      name: 'Rendered Content Parity',
      status: 'WARNING',
      severity: 'MEDIUM',
      message: `Failed to fetch raw HTML: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
    return { checks };
  }

  const rawText = extractVisibleText(rawHtml);
  const rawWords = countWords(rawText);

  try {
    const browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage({ userAgent });
    await page.goto(url, { waitUntil: 'networkidle', timeout });
    const renderedText = await page.evaluate(() => document.body?.innerText ?? '');
    await browser.close();

    const renderedWords = countWords(renderedText);
    const ratio = rawWords > 0 ? renderedWords / rawWords : 0;

    if ((renderedWords > rawWords * 1.5 && renderedWords - rawWords > 200) ||
        (rawWords < 50 && renderedWords > 300)) {
      checks.push({
        name: 'Rendered Content Parity',
        status: 'WARNING',
        severity: 'MEDIUM',
        message: `Rendered content is much larger than HTML (${renderedWords} vs ${rawWords} words)`,
        fix: 'Ensure critical content is server-rendered for crawlability',
        details: { rawWords, renderedWords, ratio },
      });
    } else {
      checks.push({
        name: 'Rendered Content Parity',
        status: 'PASSED',
        severity: 'LOW',
        message: `Rendered and HTML content are similar (${renderedWords} vs ${rawWords} words)`,
        details: { rawWords, renderedWords, ratio },
      });
    }
  } catch (error) {
    checks.push({
      name: 'Rendered Content Parity',
      status: 'WARNING',
      severity: 'MEDIUM',
      message: `Rendering check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  return { checks };
}

export type { RenderingValidatorOptions };
