# /build — Full Project Build

## Instructions
You are building the ENT Agency Creator Dashboard. Follow these steps exactly. Do not skip steps. Do not stop until the validation checklist in CLAUDE.md passes.

## Step 0: Preflight
```bash
chmod +x scripts/preflight.sh
bash scripts/preflight.sh
```
If it exits non-zero, follow its instructions and stop. If it exits 0, continue.

## Step 1: Init (skip if package.json exists)
```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --yes
```
Then:
```bash
npm install axios airtable recharts date-fns
npx shadcn@latest init -y -d
npx shadcn@latest add card button badge table tabs skeleton toast alert separator avatar dropdown-menu
```
If any shadcn component fails, skip it and create a minimal version manually.

## Step 2: Airtable Layer
Build `src/lib/airtable/client.ts` and `src/lib/airtable/tokens.ts`.
Test: read Nicki's record. If the record doesn't exist, create it with defaults from docs/AIRTABLE_SCHEMA.md.
Handle missing fields gracefully — never crash on a missing column.

## Step 3: TokenManager
Build `src/lib/ltk/token-manager.ts` following docs/LTK_AUTH.md exactly.
Build `src/lib/ltk/types.ts` with all type definitions.
Build `src/lib/ltk/endpoints.ts` with URL builders from docs/LTK_API.md.
Build `src/lib/ltk/api-client.ts` with axios interceptors.
Build `src/lib/errors.ts` with error classification.
Build `src/lib/cache.ts` with in-memory TTL cache.

## Step 4: API Routes
Build every route in the structure defined in CLAUDE.md.
Each route must: parse params, use TokenManager, return typed JSON, handle errors.
The /api/connect/ltk route should accept POST with {access_token, refresh_token, expires_at} and store in Airtable.
The /api/health route should return status for every creator in Airtable.
Cron routes should verify CRON_SECRET header.

## Step 5: Components
Build all components in src/components/. Use shadcn/ui as base. Use recharts for charts.
If LTK data isn't available (no valid token), show placeholder/empty states — never crash.

## Step 6: Pages
Build all pages. Server components fetch data from internal API routes.
Handle loading and error states. Show useful empty states when no data.

## Step 7: Vercel Config
Create vercel.json with cron entries from docs/ARCHITECTURE.md.

## Step 8: Validate
Run `npm run build`. Fix every error. Loop until it exits 0.
Run `npm run dev`. Hit each URL from the validation checklist in CLAUDE.md.
If any URL fails, fix and re-test.

Do not consider yourself done until every item in the CLAUDE.md validation checklist passes.
