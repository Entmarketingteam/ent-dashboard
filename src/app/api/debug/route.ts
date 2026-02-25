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
  const profileId = '6cc59976-d411-11e8-9fed-0242ac110002';
  const publisherId = '293045';
  const accountId = '278632';

  const tests = [
    // Profile-based analytics
    { key: 'profile_ltks', url: `https://api-gateway.rewardstyle.com/api/pub/v2/profiles/${profileId}/ltks?limit=20` },
    { key: 'profile_links', url: `https://api-gateway.rewardstyle.com/api/pub/v2/profiles/${profileId}/links?limit=10` },
    { key: 'publisher_summary', url: `https://api-gateway.rewardstyle.com/api/pub/v2/publishers/${publisherId}/summary` },
    { key: 'publisher_analytics', url: `https://api-gateway.rewardstyle.com/api/pub/v2/publishers/${publisherId}/analytics?range=last_30_days` },
    { key: 'account_analytics', url: `https://api-gateway.rewardstyle.com/api/pub/v2/accounts/${accountId}/analytics?range=last_30_days` },
    // LTK specific
    { key: 'ltks_list', url: `https://api-gateway.rewardstyle.com/api/ltk/v2/ltks?profile_id=${profileId}&limit=10` },
    { key: 'ltk_v3', url: `https://api-gateway.rewardstyle.com/api/ltk/v3/ltks?profile_id=${profileId}&limit=5` },
    // Nicki's posts via public API (no auth needed)
    { key: 'public_ltks', url: `https://api-gateway.rewardstyle.com/api/ltk/v2/ltks?profile_id=${profileId}&limit=5&fields[]=id,hero_image_url,title,products` },
    // Try the analytics with RS auth header format
    { key: 'analytics_no_pid', url: `https://api-gateway.rewardstyle.com/api/creator-analytics/v1/performance_summary?range=last_30_days` },
  ];

  for (const test of tests) {
    try {
      const res = await axios.get(test.url, { headers, timeout: 8000 });
      results[test.key] = { status: res.status, sample: JSON.stringify(res.data).slice(0, 400) };
    } catch (e) {
      if (axios.isAxiosError(e)) {
        results[test.key] = { status: e.response?.status ?? 'NO_RESPONSE', sample: JSON.stringify(e.response?.data ?? '').slice(0, 150) };
      } else {
        results[test.key] = { error: String(e).slice(0, 100) };
      }
    }
  }

  return NextResponse.json(results, { status: 200 });
}
