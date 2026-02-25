# Architecture

```
  Browser (Dashboard UI)
       │
       ▼
  Next.js App Router (Vercel)
       │
       ├── /api/ltk/[creator]/* ──► TokenManager ──► Airtable (read/write tokens)
       │                                │
       │                                ▼
       │                          LTK Auth0 (refresh)
       │                                │
       │                                ▼
       │                          LTK API Gateway (data)
       │
       ├── /api/cron/refresh-tokens ──► Proactive refresh every 45 min
       ├── /api/cron/sync-analytics ──► Cache data every 4 hours
       └── /api/health ──► Token status for all creators
```

## Data Flow: Page Load
1. Server component calls internal API route
2. API route → TokenManager.getValidToken(creator)
3. TokenManager: read Airtable → check JWT exp → refresh if needed → return token
4. API route calls LTK with token → returns data to component
5. Component renders charts

## Data Flow: Cron Refresh (every 45 min)
1. Vercel cron hits /api/cron/refresh-tokens
2. Read all creators from Airtable
3. For each: decode JWT, if expiring within 60 min → proactive refresh
4. Write new tokens back to Airtable

## Data Flow: Cron Sync (every 4 hours)
1. Vercel cron hits /api/cron/sync-analytics
2. For each creator: fetch hero_chart + earnings + engagement
3. Cache results (in-memory Map with TTL, or Vercel KV if available)

## Error Recovery
| Error | Auto-Recovery | Fallback |
|-------|--------------|----------|
| Token expiring | Proactive refresh via cron | On-demand refresh on API call |
| Token consumed (invalid_grant) | None | Mark needs_reauth, show on /settings |
| Rate limited (429) | Backoff + retry 3x | Return cached data or error |
| LTK API 5xx | Retry 3x | Return cached data or error |
| Airtable unreachable | Use in-memory token cache | Retry on next request |

## Vercel Config
```json
{
  "crons": [
    { "path": "/api/cron/refresh-tokens", "schedule": "*/45 * * * *" },
    { "path": "/api/cron/sync-analytics", "schedule": "0 */4 * * *" }
  ]
}
```
