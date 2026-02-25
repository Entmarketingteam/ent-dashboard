import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getCreatorBySlug } from '@/lib/airtable/tokens';
import { getValidToken } from '@/lib/ltk/token-manager';

const NICKI_PROFILE_ID = '6cc59976-d411-11e8-9fed-0242ac110002';

interface LTKProduct {
  id: string;
  ltk_id: string;
  hyperlink: string;
  image_url: string;
  retailer_display_name: string;
}

interface LTKPost {
  id: string;
  hash: string;
  share_url: string;
  hero_image: string;
  caption: string;
  date_published: string;
  product_ids: string[];
  status: string;
}

interface LTKApiResponse {
  ltks: LTKPost[];
  products: LTKProduct[];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ creatorSlug: string }> }
) {
  const { creatorSlug } = await params;

  try {
    const creator = await getCreatorBySlug(creatorSlug);
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const profileId = creator.profileId ?? NICKI_PROFILE_ID;

    // Get a valid access token
    let token: string;
    try {
      token = await getValidToken(creatorSlug);
    } catch {
      return NextResponse.json({ error: 'needs_reauth', slug: creatorSlug }, { status: 401 });
    }

    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const dateStart = thirtyDaysAgo.toISOString().split('T')[0];
    const dateEnd = today.toISOString().split('T')[0];

    const response = await axios.get<LTKApiResponse>(
      'https://api-gateway.rewardstyle.com/api/ltk/v2/ltks',
      {
        params: {
          profile_id: profileId,
          limit: 100,
          date_published_start: dateStart,
          date_published_end: dateEnd,
          status: 'PUBLISHED',
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 30000,
      }
    );

    const ltks: LTKPost[] = response.data.ltks ?? [];
    const products: LTKProduct[] = response.data.products ?? [];

    // Build a map of product_id -> product for quick lookup
    const productMap = new Map<string, LTKProduct>();
    for (const p of products) {
      productMap.set(p.id, p);
    }

    // Posts per day — fill every day in the 30-day window with 0 initially
    const postsPerDay: Record<string, number> = {};
    for (let i = 0; i <= 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(thirtyDaysAgo.getDate() + i);
      const key = d.toISOString().split('T')[0];
      postsPerDay[key] = 0;
    }
    for (const post of ltks) {
      const day = post.date_published.split('T')[0];
      if (day in postsPerDay) {
        postsPerDay[day] = (postsPerDay[day] ?? 0) + 1;
      }
    }
    const postsPerDayArray = Object.entries(postsPerDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Top retailers
    const retailerCounts: Record<string, number> = {};
    for (const post of ltks) {
      for (const pid of post.product_ids ?? []) {
        const product = productMap.get(pid);
        if (product?.retailer_display_name) {
          const name = product.retailer_display_name;
          retailerCounts[name] = (retailerCounts[name] ?? 0) + 1;
        }
      }
    }
    const topRetailers = Object.entries(retailerCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    // Avg posts per week
    const postsCount = ltks.length;
    const avgPostsPerWeek = parseFloat((postsCount / (30 / 7)).toFixed(1));

    // Total products linked
    const totalProducts = ltks.reduce((sum, p) => sum + (p.product_ids?.length ?? 0), 0);

    // Top retailer name
    const topRetailerName = topRetailers[0]?.name ?? '—';

    // Recent posts — 12 most recent
    const sorted = [...ltks].sort(
      (a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime()
    );
    const recentPosts = sorted.slice(0, 12).map((post) => ({
      id: post.id,
      share_url: post.share_url,
      hero_image: post.hero_image,
      caption: post.caption,
      date_published: post.date_published,
      product_count: post.product_ids?.length ?? 0,
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
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      return NextResponse.json({ error: 'needs_reauth', slug: creatorSlug }, { status: 401 });
    }
    console.error(`[data:${creatorSlug}]`, err);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
