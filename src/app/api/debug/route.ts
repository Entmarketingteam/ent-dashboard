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
  const h = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
  const profileId = '6cc59976-d411-11e8-9fed-0242ac110002';

  // Get real ltk IDs from the API
  const ltksRes = await axios.get(
    `https://api-gateway.rewardstyle.com/api/ltk/v2/ltks?profile_id=${profileId}&limit=5`,
    { headers: h }
  );
  const ltks = ltksRes.data.ltks as Array<{ id: string; product_ids: string[] }>;
  const ltkIdArr = ltks.map((l) => l.id);
  const productIdArr = ltks.flatMap((l) => l.product_ids);

  results['ltk_ids'] = ltkIdArr;

  const clicksTests = [
    // POST with array body
    { key: 'clicks_post_arr', method: 'POST', url: 'https://api-gateway.rewardstyle.com/api/ltk/v2/ltks/clicks', data: { ids: ltkIdArr } },
    // POST with ltk_ids
    { key: 'clicks_post_ltk_ids', method: 'POST', url: 'https://api-gateway.rewardstyle.com/api/ltk/v2/ltks/clicks', data: { ltk_ids: ltkIdArr } },
    // GET with ids[] format
    { key: 'clicks_get_bracket', method: 'GET', url: `https://api-gateway.rewardstyle.com/api/ltk/v2/ltks/clicks?${ltkIdArr.map(id => `ids[]=${id}`).join('&')}` },
    // GET ltk analytics
    { key: 'analytics_post', method: 'POST', url: 'https://api-gateway.rewardstyle.com/api/ltk/v2/ltks/analytics', data: { ids: ltkIdArr } },
    // Product clicks POST
    { key: 'product_clicks_post', method: 'POST', url: 'https://api-gateway.rewardstyle.com/api/ltk/v2/products/clicks', data: { ids: productIdArr.slice(0, 3) } },
    // Try singular ltk analytics
    { key: 'single_ltk_analytics', method: 'GET', url: `https://api-gateway.rewardstyle.com/api/ltk/v2/ltks/${ltkIdArr[0]}/analytics` },
    { key: 'single_ltk_clicks', method: 'GET', url: `https://api-gateway.rewardstyle.com/api/ltk/v2/ltks/${ltkIdArr[0]}/clicks` },
    { key: 'single_ltk_stats', method: 'GET', url: `https://api-gateway.rewardstyle.com/api/ltk/v2/ltks/${ltkIdArr[0]}/stats` },
  ];

  for (const test of clicksTests) {
    try {
      const res = test.method === 'POST'
        ? await axios.post(test.url, test.data, { headers: h, timeout: 8000 })
        : await axios.get(test.url, { headers: h, timeout: 8000 });
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
