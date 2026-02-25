import Airtable from 'airtable';

export const TABLE_NAME = 'LTK_Credentials';

let _base: Airtable.Base | null = null;

export function getAirtableBase(): Airtable.Base {
  if (_base) return _base;
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!apiKey) throw new Error('AIRTABLE_API_KEY is not set');
  if (!baseId) throw new Error('AIRTABLE_BASE_ID is not set');
  _base = new Airtable({ apiKey }).base(baseId);
  return _base;
}

// Kept for backwards compat — lazily resolved on first call
export const airtableBase = new Proxy({} as Airtable.Base, {
  get(_target, prop) {
    return (getAirtableBase() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
