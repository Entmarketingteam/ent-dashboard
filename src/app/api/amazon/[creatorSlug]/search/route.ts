import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getAmazonToken } from '@/lib/amazon/token-manager';

const API_BASE = 'https://creatorsapi.amazon/catalog/v1';

const RESOURCES = [
  'itemInfo.title',
  'itemInfo.byLineInfo',
  'offersV2.listings.price',
  'offersV2.listings.condition',
  'images.primary.large',
  'images.primary.medium',
  'customerReviews.starRating',
  'customerReviews.count',
];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ creatorSlug: string }> }
) {
  const { creatorSlug } = await params;

  const url = new URL(req.url);
  const keywords = url.searchParams.get('keywords');
  if (!keywords) {
    return NextResponse.json({ error: 'keywords required' }, { status: 400 });
  }

  const associateTag = process.env.AMAZON_ASSOCIATE_TAG;
  if (!associateTag) {
    return NextResponse.json({ error: 'Amazon not configured' }, { status: 500 });
  }

  try {
    const token = await getAmazonToken(creatorSlug);

    const response = await axios.post(
      `${API_BASE}/searchItems`,
      {
        keywords,
        partnerTag: associateTag,
        partnerType: 'Associates',
        resources: RESOURCES,
        itemCount: 10,
      },
      {
        headers: {
          Authorization: `Bearer ${token}, Version 3.1`,
          'Content-Type': 'application/json',
          'x-marketplace': 'www.amazon.com',
        },
        timeout: 15000,
      }
    );

    const items = response.data?.searchResult?.items ?? [];
    const totalCount = response.data?.searchResult?.totalResultCount ?? 0;

    const results = items.map((item: Record<string, unknown>) => {
      const itemInfo = item.itemInfo as Record<string, unknown> ?? {};
      const offersV2 = item.offersV2 as Record<string, unknown> ?? {};
      const images = item.images as Record<string, unknown> ?? {};
      const reviews = item.customerReviews as Record<string, unknown> ?? {};

      const titleObj = (itemInfo.title as Record<string, unknown>) ?? {};
      const brandObj = ((itemInfo.byLineInfo as Record<string, unknown>)?.brand as Record<string, unknown>) ?? {};
      const listings = (offersV2.listings as unknown[]) ?? [];
      const priceObj = listings.length > 0 ? ((listings[0] as Record<string, unknown>).price as Record<string, unknown>) ?? {} : {};
      const primaryImage = (images.primary as Record<string, unknown>) ?? {};
      const largeImage = (primaryImage.large as Record<string, unknown>) ?? (primaryImage.medium as Record<string, unknown>) ?? {};

      return {
        asin: item.asin,
        title: titleObj.displayValue ?? '',
        brand: brandObj.displayValue ?? '',
        price: priceObj.displayAmount ?? null,
        priceAmount: priceObj.amount ?? null,
        imageUrl: largeImage.url ?? null,
        starRating: (reviews.starRating as Record<string, unknown>)?.displayValue ?? null,
        reviewCount: (reviews.count as Record<string, unknown>)?.displayValue ?? null,
        affiliateUrl: `https://www.amazon.com/dp/${item.asin}?tag=${associateTag}`,
      };
    });

    return NextResponse.json({ results, totalCount });
  } catch (err) {
    console.error(`[amazon:search:${creatorSlug}]`, err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
