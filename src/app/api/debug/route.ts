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

  // Get full ltks response first
  try {
    const res = await axios.get(
      `https://api-gateway.rewardstyle.com/api/ltk/v2/ltks?profile_id=${profileId}&limit=3`,
      { headers, timeout: 10000 }
    );
    results['ltks_full'] = res.data;
  } catch (e) {
    results['ltks_full'] = { error: String(e) };
  }

  // Try analytics endpoints under ltk/v2
  const analyticsTests = [
    { key: 'ltk_v2_analytics', url: `https://api-gateway.rewardstyle.com/api/ltk/v2/analytics?publisher_id=${publisherId}&range=last_30_days` },
    { key: 'ltk_v2_profile_analytics', url: `https://api-gateway.rewardstyle.com/api/ltk/v2/profiles/${profileId}/analytics?range=last_30_days` },
    { key: 'ltk_v2_profile_stats', url: `https://api-gateway.rewardstyle.com/api/ltk/v2/profiles/${profileId}/stats?range=last_30_days` },
    { key: 'ltk_v2_earnings', url: `https://api-gateway.rewardstyle.com/api/ltk/v2/earnings?range=last_30_days` },
    { key: 'ltk_v2_earnings_pub', url: `https://api-gateway.rewardstyle.com/api/ltk/v2/earnings?publisher_id=${publisherId}&range=last_30_days` },
    { key: 'ltk_v2_clicks', url: `https://api-gateway.rewardstyle.com/api/ltk/v2/ltks/clicks?publisher_id=${publisherId}&range=last_30_days` },
    // Try creator-analytics with v2
    { key: 'ca_v2', url: `https://api-gateway.rewardstyle.com/api/creator-analytics/v2/performance_summary?range=last_30_days&publisher_id=${publisherId}` },
    // Try the exact analytics path the LTK app would use
    { key: 'analytics_dashboard', url: `https://api-gateway.rewardstyle.com/api/ltk/v2/analytics/dashboard?publisher_id=${publisherId}&range=last_30_days` },
    // Publisher v3
    { key: 'pub_v3_analytics', url: `https://api-gateway.rewardstyle.com/api/pub/v3/analytics?range=last_30_days` },
  ];

  for (const test of analyticsTests) {
    try {
      const res = await axios.get(test.url, { headers, timeout: 8000 });
      results[test.key] = { status: res.status, sample: JSON.stringify(res.data).slice(0, 300) };
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
