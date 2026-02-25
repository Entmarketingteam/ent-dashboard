# LTK Authentication — Token Rotation

## The Problem
LTK uses Auth0 with single-use refresh tokens. Every refresh consumes the old token and issues a new one. If the new token isn't persisted immediately, you're locked out. Multiple concurrent refreshes will also break — only the first one succeeds.

## Auth Config
```
Token URL:    https://creator-auth.shopltk.com/oauth/token
Client ID:    iKyQz7GfBMBPqUqCbbKSNBUlM2VpNWUT
Token TTL:    36,000 seconds (10 hours)
Scopes:       openid profile email ltk.publisher offline_access
```

## Refresh Request
```http
POST https://creator-auth.shopltk.com/oauth/token
Content-Type: application/json

{ "grant_type": "refresh_token", "client_id": "iKyQz7GfBMBPqUqCbbKSNBUlM2VpNWUT", "refresh_token": "{TOKEN}" }
```

## Refresh Response
```json
{
  "access_token": "eyJhbG...",
  "refresh_token": "v1.NEW...",
  "token_type": "Bearer",
  "expires_in": 36000
}
```

## TokenManager Implementation Requirements

### Mutex Pattern
```
getValidToken(creatorId):
  1. Read tokens from Airtable for creatorId
  2. Decode JWT → check exp claim with 30-min buffer
  3. If valid → return access_token
  4. If expired/expiring → check if refresh already in-flight for this creator
     a. If yes → await the existing promise (don't start a second refresh)
     b. If no → start refresh, store the promise in a Map
  5. On refresh success → IMMEDIATELY write new tokens to Airtable BEFORE returning
  6. On refresh failure (invalid_grant) → mark creator as needs_reauth in Airtable
  7. Clean up the promise from the Map in a finally block
```

### JWT Decode (no library needed)
```typescript
function decodeJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.exp ?? null;
  } catch { return null; }
}
```

### Error: invalid_grant
Means the refresh token was already used or revoked. No auto-recovery possible.
→ Set status = "needs_reauth" in Airtable
→ Dashboard shows reconnect instructions on /settings page

### Error: 429 (rate limit)
→ Exponential backoff: 1s, 2s, 4s. Max 3 retries.

## Re-Auth Bookmarklet
When a token dies, the creator runs this in their browser while logged into creator.shopltk.com:

```javascript
javascript:void(function(){try{var k=Object.keys(localStorage).find(function(k){return k.indexOf('@@auth0spajs@@')>-1&&k.indexOf('iKyQz7GfBMBPqUqCbbKSNBUlM2VpNWUT')>-1});if(!k){alert('Not logged in to LTK');return}var d=JSON.parse(localStorage.getItem(k));var p={access_token:d.body.access_token,refresh_token:d.body.refresh_token,expires_at:d.expiresAt};navigator.clipboard.writeText(JSON.stringify(p)).then(function(){alert('Copied! Paste into the dashboard settings page.')}).catch(function(){prompt('Copy this:',JSON.stringify(p))})}catch(e){alert('Error: '+e.message)}})()
```

The /api/connect/ltk route receives this payload and stores it in Airtable.
