import { NextResponse } from 'next/server';
import { getAllCreators } from '@/lib/airtable/tokens';
import type { CreatorHealth } from '@/types';

export async function GET() {
  try {
    const creators = await getAllCreators();
    const health: CreatorHealth[] = creators.map((c) => ({
      slug: c.slug,
      creator: c.creator,
      status: c.status,
      lastRefreshed: c.lastRefreshed,
      publisherId: c.publisherId,
    }));
    return NextResponse.json({ creators: health, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[health]', err);
    return NextResponse.json({ error: 'Failed to fetch health' }, { status: 500 });
  }
}
