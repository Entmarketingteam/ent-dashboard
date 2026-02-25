import axios from 'axios';
import { getExistingPostIds, insertPosts } from '@/lib/airtable/posts';
import type { CachedPost } from '@/lib/airtable/posts';

interface LTKPost {
  id: string;
  share_url: string;
  hero_image: string;
  caption: string;
  date_published: string;
  product_ids: string[];
}

interface LTKProduct {
  id: string;
  retailer_display_name: string;
}

interface LTKApiResponse {
  ltks: LTKPost[];
  products: LTKProduct[];
}

export async function syncCreatorPosts(
  slug: string,
  profileId: string,
  token: string,
  start: string,
  end: string
): Promise<number> {
  const existingIds = await getExistingPostIds(slug);
  const newPosts: CachedPost[] = [];

  let currentEnd = end;

  while (true) {
    const response = await axios.get<LTKApiResponse>(
      'https://api-gateway.rewardstyle.com/api/ltk/v2/ltks',
      {
        params: {
          profile_id: profileId,
          limit: 50,
          date_published_start: start,
          date_published_end: currentEnd,
          status: 'PUBLISHED',
        },
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
        timeout: 30000,
      }
    );

    const ltks: LTKPost[] = response.data.ltks ?? [];
    const products: LTKProduct[] = response.data.products ?? [];

    const productMap = new Map<string, LTKProduct>();
    for (const p of products) {
      productMap.set(p.id, p);
    }

    for (const post of ltks) {
      if (existingIds.has(post.id)) continue;
      existingIds.add(post.id);

      const retailerNames = (post.product_ids ?? [])
        .map((pid) => productMap.get(pid)?.retailer_display_name)
        .filter((n): n is string => !!n);
      const uniqueRetailers = [...new Set(retailerNames)];

      newPosts.push({
        postId: post.id,
        creatorSlug: slug,
        datePublished: post.date_published.split('T')[0],
        shareUrl: post.share_url ?? '',
        heroImage: post.hero_image ?? '',
        caption: post.caption ?? '',
        productCount: post.product_ids?.length ?? 0,
        retailers: JSON.stringify(uniqueRetailers),
      });
    }

    if (ltks.length < 50) break;

    // Respect LTK rate limit between paginated calls
    await new Promise((r) => setTimeout(r, 2000));

    // Date-sliding: find oldest date in batch, slide end back one day
    const oldest = ltks.reduce((min, p) => {
      const d = p.date_published.split('T')[0];
      return d < min ? d : min;
    }, ltks[0].date_published.split('T')[0]);

    const oldestDate = new Date(oldest + 'T00:00:00Z');
    oldestDate.setUTCDate(oldestDate.getUTCDate() - 1);
    currentEnd = oldestDate.toISOString().split('T')[0];

    if (currentEnd < start) break;
  }

  if (newPosts.length > 0) {
    await insertPosts(newPosts);
  }

  return newPosts.length;
}
