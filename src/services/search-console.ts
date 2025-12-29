// Google Search Console API Service

import { google } from 'googleapis';
import { getAuthClient, isGoogleAuthConfigured } from './google-auth.js';
import type { IndexingStatusResult } from '../types/index.js';

interface InspectionResult {
  inspectionResult?: {
    indexStatusResult?: {
      verdict?: string;
      coverageState?: string;
      robotsTxtState?: string;
      indexingState?: string;
      lastCrawlTime?: string;
      pageFetchState?: string;
      googleCanonical?: string;
      userCanonical?: string;
    };
    mobileUsabilityResult?: {
      verdict?: string;
    };
    richResultsResult?: {
      verdict?: string;
      detectedItems?: Array<{
        richResultType?: string;
      }>;
    };
  };
}

export async function inspectUrl(
  inspectionUrl: string,
  siteUrl: string
): Promise<IndexingStatusResult> {
  if (!isGoogleAuthConfigured()) {
    throw new Error(
      'Google Search Console API not configured. Please set up authentication (see README for instructions).'
    );
  }

  const auth = await getAuthClient();
  const searchConsole = google.searchconsole({ version: 'v1', auth });

  try {
    const response = await searchConsole.urlInspection.index.inspect({
      requestBody: {
        inspectionUrl,
        siteUrl,
      },
    });

    const data = response.data as InspectionResult;
    const result = data.inspectionResult;
    const indexStatus = result?.indexStatusResult;
    const mobileResult = result?.mobileUsabilityResult;
    const richResults = result?.richResultsResult;

    // Map indexing state
    let indexingState: IndexingStatusResult['indexingState'] = 'UNKNOWN';
    const coverageState = indexStatus?.coverageState ?? '';

    if (
      coverageState === 'Submitted and indexed' ||
      coverageState === 'Indexed, not submitted in sitemap'
    ) {
      indexingState = 'INDEXED';
    } else if (coverageState) {
      indexingState = 'NOT_INDEXED';
    }

    // Extract rich results types
    const richResultTypes =
      richResults?.detectedItems?.map((item) => item.richResultType ?? 'Unknown') ?? [];

    return {
      url: inspectionUrl,
      indexingState,
      verdict: indexStatus?.verdict ?? 'Unknown',
      lastCrawlTime: indexStatus?.lastCrawlTime ?? null,
      crawlability: {
        verdict: indexStatus?.pageFetchState ?? 'Unknown',
        robotsTxtState: indexStatus?.robotsTxtState ?? null,
      },
      indexability: {
        verdict: coverageState || 'Unknown',
        reason: indexStatus?.indexingState ?? null,
      },
      mobileFriendly: mobileResult?.verdict === 'PASS',
      richResults: richResultTypes,
    };
  } catch (error) {
    // Handle specific API errors
    if (error instanceof Error) {
      const errorMessage = error.message;

      if (errorMessage.includes('403')) {
        throw new Error(
          `Access denied. Ensure your service account email is added as a user to the Search Console property "${siteUrl}".`
        );
      }

      if (errorMessage.includes('404')) {
        throw new Error(
          `Property not found: "${siteUrl}". Verify the site URL format matches exactly what's in Search Console (e.g., https://example.com/ with trailing slash).`
        );
      }

      if (errorMessage.includes('quota')) {
        throw new Error(
          'URL Inspection API quota exceeded (600 requests/day). Try again tomorrow.'
        );
      }
    }

    throw error;
  }
}
