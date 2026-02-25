# Airtable Schema

## Base
- Name: "Claude Created LTK and AMAZON EARNINGS"
- ID: `appQnKyfyRyhHX44h`

## Table: LTK_Credentials
- Name: `LTK_Credentials`
- ID: `tbl5TEfzBwGPeT1rX`

## Known Fields (may be incomplete — code should handle missing fields gracefully)
| Field | Type | Notes |
|-------|------|-------|
| Creator | Single line text | Primary lookup (e.g., "Nicki Entenmann") |
| Refresh_Token | Long text | Current refresh token |
| Access_Token | Long text | Current access token (JWT) |
| ID_Token | Long text | Not used for API calls |

## Fields That Should Exist (create via API if missing)
| Field | Type | Notes |
|-------|------|-------|
| Last_Refreshed | Single line text | ISO timestamp of last refresh (use text, not date, for simplicity) |
| Status | Single line text | active / expiring / error / needs_reauth |
| Publisher_ID | Single line text | LTK publisher ID (e.g., "293045") |
| Slug | Single line text | URL-friendly ID (e.g., "nicki") |

## Self-Healing Logic
In `src/lib/airtable/tokens.ts`, the read function should:
1. Try to read the record
2. If a field is missing from the response, don't crash — use defaults
3. On write, only update fields that exist (use a try/catch per field if needed)
4. Log warnings for missing fields but don't fail the build

## Default Creator Record
If no records exist for Nicki, create one:
```json
{
  "Creator": "Nicki Entenmann",
  "Publisher_ID": "293045",
  "Slug": "nicki",
  "Status": "needs_reauth"
}
```

## API Usage
```typescript
// Read
const records = await base('LTK_Credentials')
  .select({ filterByFormula: `{Slug} = "nicki"` })
  .firstPage();
// Fallback if Slug doesn't exist:
const records = await base('LTK_Credentials')
  .select({ filterByFormula: `{Creator} = "Nicki Entenmann"` })
  .firstPage();

// Write
await base('LTK_Credentials').update(recordId, {
  "Refresh_Token": newRefreshToken,
  "Access_Token": newAccessToken,
  "Last_Refreshed": new Date().toISOString(),
  "Status": "active"
});
```
