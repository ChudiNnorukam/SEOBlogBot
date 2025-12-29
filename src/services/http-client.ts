// HTTP Client Service for SEOBlogBot

import type { HttpResponse } from '../types/index.js';

const DEFAULT_TIMEOUT = 30000;
const USER_AGENT = 'SEOBlogBot/1.0 (MCP SEO Audit Tool)';

export async function fetchUrl(
  url: string,
  options: {
    timeout?: number;
    followRedirects?: boolean;
  } = {}
): Promise<HttpResponse> {
  const { timeout = DEFAULT_TIMEOUT, followRedirects = true } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: followRedirects ? 'follow' : 'manual',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': '*/*',
      },
    });

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const body = await response.text();

    return {
      status: response.status,
      headers,
      body,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchWithHeaders(
  url: string
): Promise<{ status: number; headers: Record<string, string> }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    return {
      status: response.status,
      headers,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.href;
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
}

export function joinUrl(base: string, path: string): string {
  const baseUrl = new URL(base);
  return new URL(path, baseUrl).href;
}
