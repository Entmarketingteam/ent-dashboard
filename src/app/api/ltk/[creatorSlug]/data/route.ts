import { NextRequest, NextResponse } from 'next/server';
import { getCreatorBySlug } from '@/lib/airtable/tokens';
import { getValidToken } from '@/lib/ltk/token-manager';
import { ensurePostsTable, getPostsByDateRange } from '@/lib/airtable/posts';
import { syncCreatorPosts } from '@/lib/ltk/sync';

const NICKI_PROFILE_ID = '6cc59976-d411-11e8-9fed-0242ac110002';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ creatorSlug: string }> }
) {
  const { creatorSlug } = await params;

  const url = new URL(req.url);
  const today = new Date();
  const dateEnd = url.searchParams.get('end') ?? today.toISOString().split('T')[0];
  const defaultStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const dateStart = url.searchParams.get('start') ?? defaultStart;

  try {
    const creator = await getCreatorBySlug(creatorSlug);
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const profileId = creator.profileId ?? NICKI_PROFILE_ID;

    await ensurePostsTable();

    let posts = await getPostsByDateRange(creatorSlug, dateStart, dateEnd);

    // Auto-sync if no cached data for this range
    if (posts.length === 0) {
      let token: string;
      try {
        token = await getValidToken(creatorSlug);
      } catch {
        return NextResponse.json({ error: 'needs_reauth', slug: creatorSlug }, { status: 401 });
      }

      await syncCreatorPosts(creatorSlug, profileId, token, dateStart, dateEnd);
      posts = await getPostsByDateRange(creatorSlug, dateStart, dateEnd);
    }

    // Posts per day — fill every day in range with 0
    const postsPerDay: Record<string, number> = {};
    const startDate = new Date(dateStart + 'T00:00:00Z');
    const endDate = new Date(dateEnd + 'T00:00:00Z');
    for (const d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
      postsPerDay[d.toISOString().split('T')[0]] = 0;
    }
    for (const post of posts) {
      const day = post.datePublished;
      if (day in postsPerDay) {
        postsPerDay[day] = (postsPerDay[day] ?? 0) + 1;
      }
    }
    const postsPerDayArray = Object.entries(postsPerDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Top retailers from cached Retailers JSON field
    const retailerCounts: Record<string, number> = {};
    for (const post of posts) {
      try {
        const retailers = JSON.parse(post.retailers) as string[];
        for (const name of retailers) {
          retailerCounts[name] = (retailerCounts[name] ?? 0) + 1;
        }
      } catch {
        // ignore parse errors
      }
    }
    const topRetailers = Object.entries(retailerCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    const postsCount = posts.length;
    const dayCount = Math.max(
      1,
      Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
    const avgPostsPerWeek = parseFloat((postsCount / (dayCount / 7)).toFixed(1));
    const totalProducts = posts.reduce((sum, p) => sum + p.productCount, 0);
    const topRetailerName = topRetailers[0]?.name ?? '—';

    // Recent posts — 12 most recent
    const sorted = [...posts].sort((a, b) => b.datePublished.localeCompare(a.datePublished));
    const recentPosts = sorted.slice(0, 12).map((post) => ({
      id: post.postId,
      share_url: post.shareUrl,
      hero_image: post.heroImage,
      caption: post.caption,
      date_published: post.datePublished,
      product_count: post.productCount,
    }));

    return NextResponse.json({
      posts_count: postsCount,
      avg_posts_per_week: avgPostsPerWeek,
      top_retailer: topRetailerName,
      total_products: totalProducts,
      posts_per_day: postsPerDayArray,
      top_retailers: topRetailers,
      recent_posts: recentPosts,
      date_range: { start: dateStart, end: dateEnd },
    });
  } catch (err) {
    console.error(`[data:${creatorSlug}]`, err);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
