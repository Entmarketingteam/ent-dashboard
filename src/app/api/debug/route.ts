import { NextResponse } from 'next/server';
import axios from 'axios';
import { getAirtableBase, TABLE_NAME } from '@/lib/airtable/client';

export async function GET() {
  let accessToken = '';
  try {
    const records = await getAirtableBase()(TABLE_NAME).select({ maxRecords: 1 }).firstPage();
    const f = records[0]?.fields as Record<string, string>;
    accessToken = f['Access_Token'] ?? '';
  } catch (e) {
    return NextResponse.json({ error: 'Airtable failed', detail: String(e) });
  }

  const results: Record<string, unknown> = {};
  const headers = { Authorization: `Bearer ${accessToken}` };

  // Try account_id (278632) instead of publisher_id (293045)
  // Try with sigil_id UUID format
  // Try different auth header formats
  const tests = [
    // Different ID formats for hero_chart
    { key: 'hero_account_id', url: `https://api-gateway.rewardstyle.com/analytics/hero_chart?range=last_30_days&publisher_id=278632` },
    { key: 'hero_sigil', url: `https://api-gateway.rewardstyle.com/analytics/hero_chart?range=last_30_days&publisher_id=908757ef7a064ea0b6a3931d635e4318` },
    // Publisher summary
    { key: 'pub_summary', url: `https://api-gateway.rewardstyle.com/analytics/publisher/293045/summary?range=last_30_days` },
    { key: 'pub_summary2', url: `https://api-gateway.rewardstyle.com/analytics/293045/summary?range=last_30_days` },
    // LTK API without rewardstyle branding
    { key: 'ltk_hero', url: `https://api-gateway.rewardstyle.com/analytics/hero?range=last_30_days&publisher_id=293045` },
    // Check if there's a /me endpoint
    { key: 'me', url: `https://api-gateway.rewardstyle.com/api/pub/v2/me` },
    { key: 'me2', url: `https://creator-auth.shopltk.com/userinfo` },
    // Try the RS analytics with RS-specific token header
    { key: 'hero_rs_header', url: `https://api-gateway.rewardstyle.com/analytics/hero_chart?range=last_30_days&publisher_id=293045` },
    // Try ltk.app
    { key: 'ltk_app', url: `https://api-gateway.rewardstyle.com/api/ltk/v1/analytics?range=last_30_days&publisher_id=293045` },
    // Check what the creator-analytics base paths give
    { key: 'creator_analytics_root', url: `https://api-gateway.rewardstyle.com/api/creator-analytics/v1` },
    // Try oauth userinfo - might have useful data
    { key: 'userinfo', url: `https://prod-rs-influencer.us.auth0.com/userinfo` },
  ];

  for (const test of tests) {
    try {
      const res = await axios.get(test.url, { headers, timeout: 8000 });
      results[test.key] = { status: res.status, sample: JSON.stringify(res.data).slice(0, 300) };
    } catch (e) {
      if (axios.isAxiosError(e)) {
        results[test.key] = { status: e.response?.status ?? 'NO_RESPONSE', sample: JSON.stringify(e.response?.data ?? '').slice(0, 200) };
      } else {
        results[test.key] = { error: String(e).slice(0, 100) };
      }
    }
  }

  return NextResponse.json(results, { status: 200 });
}
