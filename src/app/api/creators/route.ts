import { NextRequest, NextResponse } from 'next/server';
import { getAllCreators } from '@/lib/airtable/tokens';

function withCors(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  return response;
}

export async function GET(_req: NextRequest) {
  try {
    const creators = await getAllCreators();

    const safeCreators = creators.map(
      ({ id, creator, slug, publisherId, profileId, status, lastRefreshed }) => ({
        id,
        creator,
        slug,
        publisherId,
        profileId,
        status,
        lastRefreshed,
      })
    );

    return withCors(NextResponse.json({ creators: safeCreators }));
  } catch (err) {
    console.error('[creators]', err);
    return withCors(
      NextResponse.json({ error: 'Failed to fetch creators' }, { status: 500 })
    );
  }
}

export function OPTIONS() {
  return withCors(NextResponse.json(null, { status: 204 }));
}

