import axios from 'axios';

const TOKEN_ENDPOINT = 'https://api.amazon.com/auth/O2/token';
const SCOPE = 'creatorsapi::default';

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

// In-memory cache per serverless instance (tokens expire in 1h, cache 55min)
const tokenCache: Map<string, TokenCache> = new Map();

export async function getAmazonToken(slug: string): Promise<string> {
  const cached = tokenCache.get(slug);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.accessToken;
  }

  const clientId = process.env.AMAZON_CLIENT_ID;
  const clientSecret = process.env.AMAZON_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Amazon credentials not configured');
  }

  const response = await axios.post<{ access_token: string; expires_in: number }>(
    TOKEN_ENDPOINT,
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: SCOPE,
    }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const { access_token, expires_in } = response.data;
  tokenCache.set(slug, {
    accessToken: access_token,
    expiresAt: Date.now() + (expires_in - 30) * 1000,
  });

  return access_token;
}
