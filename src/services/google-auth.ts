// Google API Authentication Service

import { google, Auth } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/webmasters'];

let cachedAuthClient: Auth.GoogleAuth | Auth.JWT | null = null;

export async function getAuthClient(): Promise<Auth.GoogleAuth | Auth.JWT> {
  if (cachedAuthClient) {
    return cachedAuthClient;
  }

  // Option 1: Service Account via JSON file path
  const credentialsPath = process.env['GOOGLE_APPLICATION_CREDENTIALS'];
  if (credentialsPath) {
    cachedAuthClient = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: SCOPES,
    });
    return cachedAuthClient;
  }

  // Option 2: Service Account via environment variables
  const clientEmail = process.env['GOOGLE_CLIENT_EMAIL'];
  const privateKey = process.env['GOOGLE_PRIVATE_KEY'];

  if (clientEmail && privateKey) {
    cachedAuthClient = new google.auth.JWT({
      email: clientEmail,
      key: privateKey.replace(/\\n/g, '\n'),
      scopes: SCOPES,
    });
    return cachedAuthClient;
  }

  throw new Error(
    'Google authentication not configured. Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON file path, or set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY environment variables.'
  );
}

export function isGoogleAuthConfigured(): boolean {
  return !!(
    process.env['GOOGLE_APPLICATION_CREDENTIALS'] ||
    (process.env['GOOGLE_CLIENT_EMAIL'] && process.env['GOOGLE_PRIVATE_KEY'])
  );
}

export function clearAuthCache(): void {
  cachedAuthClient = null;
}
