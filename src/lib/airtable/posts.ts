import Airtable from 'airtable';
import { getAirtableBase } from './client';

export const POSTS_TABLE = 'LTK_Posts';

let tableEnsured = false;

export interface CachedPost {
  postId: string;
  creatorSlug: string;
  datePublished: string; // YYYY-MM-DD
  shareUrl: string;
  heroImage: string;
  caption: string;
  productCount: number;
  retailers: string; // JSON array string
}

function recordToPost(record: Airtable.Record<Airtable.FieldSet>): CachedPost {
  const f = record.fields as Record<string, unknown>;
  return {
    postId: (f['Post_ID'] as string) ?? '',
    creatorSlug: (f['Creator_Slug'] as string) ?? '',
    datePublished: (f['Date_Published'] as string) ?? '',
    shareUrl: (f['Share_URL'] as string) ?? '',
    heroImage: (f['Hero_Image'] as string) ?? '',
    caption: (f['Caption'] as string) ?? '',
    productCount: (f['Product_Count'] as number) ?? 0,
    retailers: (f['Retailers'] as string) ?? '[]',
  };
}

export async function ensurePostsTable(): Promise<void> {
  if (tableEnsured) return;

  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!apiKey || !baseId) throw new Error('Missing Airtable credentials');

  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) throw new Error(`Airtable Meta API error: ${res.status}`);

  const { tables } = (await res.json()) as { tables: Array<{ name: string }> };
  const exists = tables.some((t) => t.name === POSTS_TABLE);

  if (!exists) {
    const createRes = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: POSTS_TABLE,
        fields: [
          { name: 'Post_ID', type: 'singleLineText' },
          { name: 'Creator_Slug', type: 'singleLineText' },
          { name: 'Date_Published', type: 'singleLineText' },
          { name: 'Share_URL', type: 'singleLineText' },
          { name: 'Hero_Image', type: 'singleLineText' },
          { name: 'Caption', type: 'multilineText' },
          { name: 'Product_Count', type: 'number', options: { precision: 0 } },
          { name: 'Retailers', type: 'multilineText' },
        ],
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      throw new Error(`Failed to create LTK_Posts table: ${JSON.stringify(err)}`);
    }
  }

  tableEnsured = true;
}

export async function getPostsByDateRange(
  slug: string,
  start: string,
  end: string
): Promise<CachedPost[]> {
  const records = await getAirtableBase()(POSTS_TABLE)
    .select({
      filterByFormula: `AND({Creator_Slug}='${slug}',{Date_Published}>='${start}',{Date_Published}<='${end}')`,
    })
    .all();
  return records.map(recordToPost);
}

export async function getExistingPostIds(slug: string): Promise<Set<string>> {
  const records = await getAirtableBase()(POSTS_TABLE)
    .select({
      filterByFormula: `{Creator_Slug}='${slug}'`,
      fields: ['Post_ID'],
    })
    .all();
  return new Set(records.map((r) => (r.fields['Post_ID'] as string) ?? '').filter(Boolean));
}

export async function insertPosts(posts: CachedPost[]): Promise<void> {
  const base = getAirtableBase();
  for (let i = 0; i < posts.length; i += 10) {
    const batch = posts.slice(i, i + 10);
    await base(POSTS_TABLE).create(
      batch.map((p) => ({
        fields: {
          Post_ID: p.postId,
          Creator_Slug: p.creatorSlug,
          Date_Published: p.datePublished,
          Share_URL: p.shareUrl,
          Hero_Image: p.heroImage,
          Caption: p.caption,
          Product_Count: p.productCount,
          Retailers: p.retailers,
        },
      }))
    );
  }
}
