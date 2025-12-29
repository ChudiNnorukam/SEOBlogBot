/**
 * Robots.txt Configuration for Next.js App Router
 * 
 * Key Features:
 * - Allows all major search engine crawlers
 * - Explicitly allows AI crawlers (GPTBot, ClaudeBot, etc.) for AEO
 * - Blocks sensitive paths (/api/, /admin/, etc.)
 * - References sitemap for discovery
 * 
 * Usage:
 *   1. Copy this file to app/robots.ts
 *   2. Update SITE_URL constant
 *   3. Adjust disallow rules for your site structure
 *   4. Deploy and verify at /robots.txt
 */

import type { MetadataRoute } from 'next';

// ============================================================================
// CONFIGURATION - UPDATE THIS
// ============================================================================

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://chudi-blog.vercel.app';

// ============================================================================
// Robots.txt Generator
// ============================================================================

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_URL.replace(/\/$/, '');
  
  return {
    rules: [
      // Default rule for all crawlers
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',           // API routes (not meant for indexing)
          '/admin/',         // Admin panel (if exists)
          '/_next/',         // Next.js internal
          '/private/',       // Private pages (if exists)
          '/*.json$',        // JSON files
          '/*?*',            // URLs with query parameters (prevent duplicate content)
        ],
      },
      
      // =========================================================
      // AI CRAWLERS - Allow for Answer Engine Optimization (AEO)
      // =========================================================
      
      // OpenAI's GPT crawler
      {
        userAgent: 'GPTBot',
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
      
      // OpenAI's ChatGPT browser plugin
      {
        userAgent: 'ChatGPT-User',
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
      
      // Anthropic's Claude crawler
      {
        userAgent: 'ClaudeBot',
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
      
      // Anthropic's Claude web feature
      {
        userAgent: 'Claude-Web',
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
      
      // Perplexity AI crawler
      {
        userAgent: 'PerplexityBot',
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
      
      // Google's AI crawler (Gemini, Bard)
      {
        userAgent: 'Google-Extended',
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
      
      // Microsoft/Bing AI crawler (Copilot)
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
      
      // Facebook/Meta crawler (for sharing)
      {
        userAgent: 'facebookexternalhit',
        allow: '/',
      },
      
      // Twitter/X crawler (for cards)
      {
        userAgent: 'Twitterbot',
        allow: '/',
      },
      
      // LinkedIn crawler (for sharing)
      {
        userAgent: 'LinkedInBot',
        allow: '/',
      },
      
      // =========================================================
      // BLOCK AGGRESSIVE/UNWANTED CRAWLERS
      // =========================================================
      
      // Common scraper bots (optional - uncomment to block)
      // {
      //   userAgent: 'AhrefsBot',
      //   disallow: '/',
      // },
      // {
      //   userAgent: 'SemrushBot',
      //   disallow: '/',
      // },
      // {
      //   userAgent: 'MJ12bot',
      //   disallow: '/',
      // },
    ],
    
    // Sitemap reference for crawler discovery
    sitemap: `${baseUrl}/sitemap.xml`,
    
    // Optional: Specify host (helps with www vs non-www)
    host: baseUrl,
  };
}

// ============================================================================
// AI Crawler Reference Table
// ============================================================================

/**
 * Major AI Crawlers as of 2025:
 * 
 * | Crawler            | Company      | Purpose                    | Respects robots.txt |
 * |--------------------|--------------|----------------------------|---------------------|
 * | GPTBot             | OpenAI       | Training + ChatGPT search  | Yes                 |
 * | ChatGPT-User       | OpenAI       | ChatGPT browser plugin     | Yes                 |
 * | ClaudeBot          | Anthropic    | Claude.ai web features     | Yes                 |
 * | Claude-Web         | Anthropic    | Claude web browsing        | Yes                 |
 * | PerplexityBot      | Perplexity   | Perplexity search          | Yes                 |
 * | Google-Extended    | Google       | Gemini/Bard training       | Yes                 |
 * | Amazonbot          | Amazon       | Alexa + training           | Yes                 |
 * | Applebot-Extended  | Apple        | Apple Intelligence         | Yes                 |
 * | Bytespider         | ByteDance    | TikTok search              | Yes                 |
 * | cohere-ai          | Cohere       | Cohere training            | Yes                 |
 * | Diffbot            | Diffbot      | Knowledge graph            | Yes                 |
 * | FacebookBot        | Meta         | Meta AI                    | Yes                 |
 * | Omgilibot          | Webz.io      | Data aggregation           | Partial             |
 * | YouBot             | You.com      | You.com search             | Yes                 |
 * 
 * IMPORTANT: Unlike Googlebot, most AI crawlers cannot execute JavaScript.
 * They only see raw HTML. Server-side rendering is essential for AEO.
 */

// ============================================================================
// Verification Steps
// ============================================================================

/**
 * After deploying, verify with:
 * 
 * 1. Direct access:
 *    curl https://your-site.com/robots.txt
 *    Expected: Text content with User-agent and Sitemap directives
 * 
 * 2. Google's robots.txt Tester:
 *    https://search.google.com/search-console/robots-testing-tool
 *    Test specific URLs against your rules
 * 
 * 3. Verify sitemap reference works:
 *    curl -I $(grep Sitemap robots.txt | cut -d' ' -f2)
 *    Expected: 200 OK
 * 
 * 4. Test AI crawler access:
 *    curl -A "GPTBot" https://your-site.com/
 *    Expected: Full HTML content (not blocked)
 */

// ============================================================================
// next.config.js Headers (For noindex on preview deployments)
// ============================================================================

/**
 * Add this to next.config.js to prevent preview deployments from being indexed:
 * 
 * module.exports = {
 *   async headers() {
 *     return [
 *       // Block indexing of non-production environments
 *       ...(process.env.VERCEL_ENV !== 'production' ? [{
 *         source: '/:path*',
 *         headers: [
 *           { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
 *         ],
 *       }] : []),
 *       
 *       // Block indexing of .vercel.app URLs in production
 *       // (you want Google to index your custom domain, not vercel.app)
 *       {
 *         source: '/:path*',
 *         has: [{ type: 'host', value: '*.vercel.app' }],
 *         headers: [
 *           { key: 'X-Robots-Tag', value: 'noindex' },
 *         ],
 *       },
 *     ];
 *   },
 * };
 */
