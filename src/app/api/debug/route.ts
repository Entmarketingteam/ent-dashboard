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
  const publisherId = '293045';

  // Get real ltk data including hash
  const ltksRes = await axios.get(
    `https://api-gateway.rewardstyle.com/api/ltk/v2/ltks?profile_id=${profileId}&limit=3`,
    { headers: h }
  );
  const ltks = ltksRes.data.ltks as Array<{ id: string; hash: string; share_url: string; product_ids: string[] }>;
  const hashes = ltks.map((l) => l.hash);
  const shareIds = ltks.map((l) => l.share_url.split('/').pop());

  results['hashes'] = hashes;
  results['share_ids'] = shareIds;

  const tests = [
    // Try hash IDs for clicks
    { key: 'clicks_hash', url: `https://api-gateway.rewardstyle.com/api/ltk/v2/ltks/clicks?ids=${hashes.join(',')}` },
    { key: 'clicks_hash_bracket', url: `https://api-gateway.rewardstyle.com/api/ltk/v2/ltks/clicks?${hashes.map(h => `ids[]=${h}`).join('&')}` },
    // Try share IDs
    { key: 'clicks_share_ids', url: `https://api-gateway.rewardstyle.com/api/ltk/v2/ltks/clicks?ids=${shareIds.join(',')}` },
    // Try with ltk_ids param
    { key: 'clicks_ltk_ids_hash', url: `https://api-gateway.rewardstyle.com/api/ltk/v2/ltks/clicks?ltk_ids=${ltks.map(l=>l.id).join(',')}` },
    // Completely different approach - publisher_analytics endpoint
    { key: 'pub_analytics', url: `https://api-gateway.rewardstyle.com/api/ltk/v2/publisher_analytics?publisher_id=${publisherId}&range=last_30_days` },
    { key: 'ltk_v2_perf', url: `https://api-gateway.rewardstyle.com/api/ltk/v2/performance?publisher_id=${publisherId}&range=last_30_days` },
    // Try the monetize API
    { key: 'monetize', url: `https://api-gateway.rewardstyle.com/api/ltk/v2/monetize?publisher_id=${publisherId}&range=last_30_days` },
    // Check the amazon_identities we saw in the docs
    { key: 'amazon_identities', url: `https://api-gateway.rewardstyle.com/api/co-api/v1/get_amazon_identities?publisher_id=${publisherId}` },
    // Try the RS reporting API
    { key: 'reporting', url: `https://api-gateway.rewardstyle.com/api/reporting/v1/summary?publisher_id=${publisherId}&range=last_30_days` },
  ];

  for (const test of tests) {
    try {
      const res = await axios.get(test.url, { headers: h, timeout: 8000 });
      results[test.key] = { status: res.status, sample: JSON.stringify(res.data).slice(0, 400) };
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
