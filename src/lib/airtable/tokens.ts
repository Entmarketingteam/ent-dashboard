import Airtable from 'airtable';
import { airtableBase, TABLE_NAME } from './client';
import type { CreatorTokenRecord } from '@/types';

function recordToCreator(record: Airtable.Record<Airtable.FieldSet>): CreatorTokenRecord {
  const f = record.fields as Record<string, string>;
  return {
    id: record.id,
    creator: f['Creator'] ?? '',
    slug: f['Slug'] ?? f['Creator']?.toLowerCase().split(' ')[0] ?? '',
    publisherId: f['Publisher_ID'] ?? '',
    accessToken: f['Access_Token'] ?? '',
    refreshToken: f['Refresh_Token'] ?? '',
    idToken: f['ID_Token'],
    lastRefreshed: f['Last_Refreshed'],
    status: (f['Status'] as CreatorTokenRecord['status']) ?? 'needs_reauth',
  };
}

export async function getCreatorBySlug(slug: string): Promise<CreatorTokenRecord | null> {
  try {
    // Try by Slug field first
    let records = await airtableBase(TABLE_NAME)
      .select({ filterByFormula: `{Slug} = "${slug}"`, maxRecords: 1 })
      .firstPage();

    if (!records.length) {
      // Fallback: try first record (for Nicki who may not have Slug set)
      records = await airtableBase(TABLE_NAME)
        .select({ maxRecords: 1 })
        .firstPage();
    }

    if (!records.length) return null;
    return recordToCreator(records[0]);
  } catch (err) {
    console.error('[Airtable] getCreatorBySlug error:', err);
    return null;
  }
}

export async function getAllCreators(): Promise<CreatorTokenRecord[]> {
  try {
    const records = await airtableBase(TABLE_NAME).select().all();
    return records.map(recordToCreator);
  } catch (err) {
    console.error('[Airtable] getAllCreators error:', err);
    return [];
  }
}

export async function updateCreatorTokens(
  recordId: string,
  data: {
    accessToken?: string;
    refreshToken?: string;
    status?: CreatorTokenRecord['status'];
    lastRefreshed?: string;
  }
): Promise<void> {
  const fields: Record<string, string> = {};
  if (data.accessToken !== undefined) fields['Access_Token'] = data.accessToken;
  if (data.refreshToken !== undefined) fields['Refresh_Token'] = data.refreshToken;
  if (data.status !== undefined) fields['Status'] = data.status;
  if (data.lastRefreshed !== undefined) fields['Last_Refreshed'] = data.lastRefreshed;

  try {
    await airtableBase(TABLE_NAME).update(recordId, fields);
  } catch (err) {
    console.error('[Airtable] updateCreatorTokens error:', err);
    throw err;
  }
}

export async function upsertCreatorBySlug(
  slug: string,
  data: Partial<Omit<CreatorTokenRecord, 'id'>>
): Promise<void> {
  const existing = await getCreatorBySlug(slug);
  const fields: Record<string, string> = {};
  if (data.creator) fields['Creator'] = data.creator;
  if (data.slug) fields['Slug'] = data.slug;
  if (data.publisherId) fields['Publisher_ID'] = data.publisherId;
  if (data.accessToken) fields['Access_Token'] = data.accessToken;
  if (data.refreshToken) fields['Refresh_Token'] = data.refreshToken;
  if (data.status) fields['Status'] = data.status;
  if (data.lastRefreshed) fields['Last_Refreshed'] = data.lastRefreshed;

  if (existing) {
    await updateCreatorTokens(existing.id, data);
  } else {
    await airtableBase(TABLE_NAME).create(fields);
  }
}
