import { NextRequest, NextResponse } from 'next/server';
import { getCreatorBySlug, updateCreatorTokens } from '@/lib/airtable/tokens';
import type { LTKConnectPayload } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as LTKConnectPayload & { slug: string };
    const { slug, access_token, refresh_token } = body;

    if (!slug || !access_token || !refresh_token) {
      return NextResponse.json({ error: 'slug, access_token, and refresh_token are required' }, { status: 400 });
    }

    const creator = await getCreatorBySlug(slug);
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    await updateCreatorTokens(creator.id, {
      accessToken: access_token,
      refreshToken: refresh_token,
      status: 'active',
      lastRefreshed: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, slug });
  } catch (err) {
    console.error('[connect/ltk]', err);
    return NextResponse.json({ error: 'Failed to store tokens' }, { status: 500 });
  }
}
