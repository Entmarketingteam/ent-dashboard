import { NextRequest, NextResponse } from 'next/server';
import { getCreatorBySlug } from '@/lib/airtable/tokens';
import { getValidToken } from '@/lib/ltk/token-manager';
import { ensurePostsTable } from '@/lib/airtable/posts';
import { syncCreatorPosts } from '@/lib/ltk/sync';

const NICKI_PROFILE_ID = '6cc59976-d411-11e8-9fed-0242ac110002';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ creatorSlug: string }> }
) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { creatorSlug } = await params;

  const url = new URL(req.url);
  const today = new Date();
  const end = url.searchParams.get('end') ?? today.toISOString().split('T')[0];
  const defaultStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const start = url.searchParams.get('start') ?? defaultStart;

  try {
    const creator = await getCreatorBySlug(creatorSlug);
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const profileId = creator.profileId ?? NICKI_PROFILE_ID;

    let token: string;
    try {
      token = await getValidToken(creatorSlug);
    } catch {
      return NextResponse.json({ error: 'needs_reauth' }, { status: 401 });
    }

    await ensurePostsTable();
    const synced = await syncCreatorPosts(creatorSlug, profileId, token, start, end);

    return NextResponse.json({ synced, start, end });
  } catch (err) {
    console.error(`[sync:${creatorSlug}]`, err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
