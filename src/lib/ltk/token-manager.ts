import axios from 'axios';
import { getCreatorBySlug, updateCreatorTokens } from '@/lib/airtable/tokens';
import type { CreatorTokenRecord } from '@/types';
import type { LTKRefreshResponse } from './types';

const AUTH_URL = process.env.LTK_AUTH_URL!;
const CLIENT_ID = process.env.LTK_CLIENT_ID!;

// In-flight refresh promises per creator slug
const refreshPromises = new Map<string, Promise<string>>();

function decodeJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.exp ?? null;
  } catch {
    return null;
  }
}

function isTokenExpiring(token: string, bufferSeconds = 1800): boolean {
  const exp = decodeJwtExp(token);
  if (!exp) return true;
  return Date.now() / 1000 + bufferSeconds > exp;
}

async function doRefresh(record: CreatorTokenRecord): Promise<string> {
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    try {
      const response = await axios.post<LTKRefreshResponse>(
        AUTH_URL,
        {
          grant_type: 'refresh_token',
          client_id: CLIENT_ID,
          refresh_token: record.refreshToken,
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const { access_token, refresh_token } = response.data;

      // Persist IMMEDIATELY before returning
      await updateCreatorTokens(record.id, {
        accessToken: access_token,
        refreshToken: refresh_token,
        status: 'active',
        lastRefreshed: new Date().toISOString(),
      });

      return access_token;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;

        if (status === 429) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((r) => setTimeout(r, delay));
          attempt++;
          continue;
        }

        if (err.response?.data?.error === 'invalid_grant') {
          await updateCreatorTokens(record.id, { status: 'needs_reauth' });
          throw new Error(`Creator ${record.slug} needs re-authentication`);
        }
      }

      attempt++;
      if (attempt >= maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  throw new Error('Max refresh attempts exceeded');
}

export async function getValidToken(slug: string): Promise<string> {
  const record = await getCreatorBySlug(slug);

  if (!record) throw new Error(`No creator record found for slug: ${slug}`);
  if (record.status === 'needs_reauth') {
    throw new Error(`Creator ${slug} needs re-authentication`);
  }

  // Token is valid and not expiring
  if (record.accessToken && !isTokenExpiring(record.accessToken)) {
    return record.accessToken;
  }

  // Check if refresh already in-flight
  if (refreshPromises.has(slug)) {
    return refreshPromises.get(slug)!;
  }

  // Start refresh
  const refreshPromise = doRefresh(record).finally(() => {
    refreshPromises.delete(slug);
  });

  refreshPromises.set(slug, refreshPromise);
  return refreshPromise;
}
