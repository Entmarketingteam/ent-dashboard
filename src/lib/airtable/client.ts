import Airtable from 'airtable';

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey) throw new Error('AIRTABLE_API_KEY is not set');
if (!baseId) throw new Error('AIRTABLE_BASE_ID is not set');

Airtable.configure({ apiKey });

export const airtableBase = new Airtable({ apiKey }).base(baseId);
export const TABLE_NAME = 'LTK_Credentials';
