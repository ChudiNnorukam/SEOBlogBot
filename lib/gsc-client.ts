// lib/gsc-client.ts
// Google Search Console API Client Stub
// Version: 1.1.0
//
// This is a stub for GSC integration. To use:
// 1. Enable the Search Console API in Google Cloud Console
// 2. Create OAuth2 credentials or Service Account
// 3. Set up authentication (see AUTHENTICATION section)
//
// Documentation: https://developers.google.com/webmaster-tools/search-console-api-original

import type { GSCIndexingStatus, GSCSearchAnalytics } from './types';

// ============================================================================
// Configuration
// ============================================================================

export interface GSCClientConfig {
  siteUrl: string;  // e.g., 'https://chudi-blog.vercel.app' or 'sc-domain:chudi-blog.vercel.app'
  credentials?: {
    type: 'oauth' | 'service_account';
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    serviceAccountKeyPath?: string;
  };
}

// ============================================================================
// Authentication Helpers
// ============================================================================

/**
 * Get OAuth2 access token
 * Requires: clientId, clientSecret, refreshToken
 */
export async function getOAuthToken(config: GSCClientConfig): Promise<string | null> {
  if (!config.credentials ||
      config.credentials.type !== 'oauth' ||
      !config.credentials.refreshToken) {
    console.error('OAuth credentials not configured');
    return null;
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.credentials.clientId!,
        client_secret: config.credentials.clientSecret!,
        refresh_token: config.credentials.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Failed to get OAuth token:', error);
    return null;
  }
}

// ============================================================================
// GSC Client Class
// ============================================================================

export class GSCClient {
  private config: GSCClientConfig;
  private accessToken: string | null = null;

  constructor(config: GSCClientConfig) {
    this.config = config;
  }

  /**
   * Initialize client with authentication
   */
  async init(): Promise<boolean> {
    if (this.config.credentials?.type === 'oauth') {
      this.accessToken = await getOAuthToken(this.config);
      return !!this.accessToken;
    }
    // For service account, you'd use google-auth-library
    console.warn('GSC Client: Service account auth not implemented in stub');
    return false;
  }

  /**
   * Get URL inspection results
   * https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect
   */
  async inspectUrl(url: string): Promise<GSCIndexingStatus | null> {
    if (!this.accessToken) {
      console.error('GSC Client not initialized');
      return null;
    }

    try {
      const response = await fetch(
        'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inspectionUrl: url,
            siteUrl: this.config.siteUrl,
          }),
        }
      );

      if (!response.ok) {
        console.error('URL inspection failed:', response.status);
        return null;
      }

      const data = await response.json();
      const result = data.inspectionResult?.indexStatusResult;

      return {
        url,
        indexingState: this.mapIndexingState(result?.verdict),
        lastCrawlTime: result?.lastCrawlTime,
        crawledAs: result?.crawledAs,
        robotsTxtState: result?.robotsTxtState,
        indexingStatus: result?.indexingState,
      };
    } catch (error) {
      console.error('URL inspection error:', error);
      return null;
    }
  }

  /**
   * Get search analytics data
   * https://developers.google.com/webmaster-tools/v1/searchanalytics/query
   */
  async getSearchAnalytics(options: {
    startDate: string;  // YYYY-MM-DD
    endDate: string;    // YYYY-MM-DD
    dimensions?: ('query' | 'page' | 'country' | 'device' | 'date')[];
    rowLimit?: number;
  }): Promise<GSCSearchAnalytics[] | null> {
    if (!this.accessToken) {
      console.error('GSC Client not initialized');
      return null;
    }

    const { startDate, endDate, dimensions = ['query', 'page'], rowLimit = 100 } = options;

    try {
      const response = await fetch(
        `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(this.config.siteUrl)}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate,
            endDate,
            dimensions,
            rowLimit,
          }),
        }
      );

      if (!response.ok) {
        console.error('Search analytics failed:', response.status);
        return null;
      }

      const data = await response.json();
      return (data.rows || []).map((row: any) => ({
        query: row.keys?.[0] || '',
        page: row.keys?.[1] || '',
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      }));
    } catch (error) {
      console.error('Search analytics error:', error);
      return null;
    }
  }

  /**
   * Submit URL for indexing
   * Note: Uses Indexing API (requires separate setup)
   * https://developers.google.com/search/apis/indexing-api
   */
  async submitUrlForIndexing(url: string): Promise<boolean> {
    if (!this.accessToken) {
      console.error('GSC Client not initialized');
      return false;
    }

    try {
      const response = await fetch(
        'https://indexing.googleapis.com/v3/urlNotifications:publish',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url,
            type: 'URL_UPDATED',
          }),
        }
      );

      return response.ok;
    } catch (error) {
      console.error('URL submission error:', error);
      return false;
    }
  }

  /**
   * Get sitemap status
   * https://developers.google.com/webmaster-tools/v1/sitemaps
   */
  async getSitemapStatus(): Promise<any[] | null> {
    if (!this.accessToken) {
      console.error('GSC Client not initialized');
      return null;
    }

    try {
      const response = await fetch(
        `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(this.config.siteUrl)}/sitemaps`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        console.error('Sitemap status failed:', response.status);
        return null;
      }

      const data = await response.json();
      return data.sitemap || [];
    } catch (error) {
      console.error('Sitemap status error:', error);
      return null;
    }
  }

  /**
   * Submit sitemap
   */
  async submitSitemap(sitemapUrl: string): Promise<boolean> {
    if (!this.accessToken) {
      console.error('GSC Client not initialized');
      return false;
    }

    try {
      const response = await fetch(
        `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(this.config.siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Sitemap submission error:', error);
      return false;
    }
  }

  private mapIndexingState(verdict?: string): GSCIndexingStatus['indexingState'] {
    switch (verdict) {
      case 'PASS':
        return 'INDEXED';
      case 'NEUTRAL':
        return 'DISCOVERED';
      case 'FAIL':
        return 'CRAWLED_NOT_INDEXED';
      case 'EXCLUDED':
        return 'EXCLUDED';
      default:
        return 'UNKNOWN';
    }
  }
}

// ============================================================================
// Setup Instructions
// ============================================================================

/**
 * GSC API Setup Instructions:
 *
 * 1. Create Google Cloud Project:
 *    - Go to https://console.cloud.google.com
 *    - Create new project or select existing
 *
 * 2. Enable APIs:
 *    - Search Console API
 *    - Indexing API (for URL submission)
 *
 * 3. Create Credentials:
 *    - For personal use: OAuth 2.0 Client ID (Desktop app)
 *    - For automation: Service Account
 *
 * 4. Get Refresh Token (OAuth):
 *    - Use OAuth playground: https://developers.google.com/oauthplayground
 *    - Authorize: https://www.googleapis.com/auth/webmasters
 *    - Exchange authorization code for tokens
 *
 * 5. Configure client:
 *    const client = new GSCClient({
 *      siteUrl: 'https://your-site.com',
 *      credentials: {
 *        type: 'oauth',
 *        clientId: process.env.GSC_CLIENT_ID,
 *        clientSecret: process.env.GSC_CLIENT_SECRET,
 *        refreshToken: process.env.GSC_REFRESH_TOKEN,
 *      },
 *    });
 *    await client.init();
 *
 * 6. Use the client:
 *    const status = await client.inspectUrl('https://your-site.com/blog/post');
 *    const analytics = await client.getSearchAnalytics({
 *      startDate: '2024-01-01',
 *      endDate: '2024-01-31',
 *    });
 */

export function printSetupInstructions(): void {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║   Google Search Console API Setup                             ║
╚═══════════════════════════════════════════════════════════════╝

1. Go to: https://console.cloud.google.com
2. Create/select a project
3. Enable: Search Console API, Indexing API
4. Create OAuth 2.0 credentials (Desktop app)
5. Use OAuth Playground to get refresh token:
   https://developers.google.com/oauthplayground
   Scope: https://www.googleapis.com/auth/webmasters

6. Set environment variables:
   export GSC_CLIENT_ID="your-client-id"
   export GSC_CLIENT_SECRET="your-client-secret"
   export GSC_REFRESH_TOKEN="your-refresh-token"
   export GSC_SITE_URL="https://your-site.com"

7. Use in code:
   import { GSCClient } from './lib/gsc-client';

   const client = new GSCClient({
     siteUrl: process.env.GSC_SITE_URL,
     credentials: {
       type: 'oauth',
       clientId: process.env.GSC_CLIENT_ID,
       clientSecret: process.env.GSC_CLIENT_SECRET,
       refreshToken: process.env.GSC_REFRESH_TOKEN,
     },
   });

   await client.init();
   const status = await client.inspectUrl('https://your-site.com/page');
`);
}
