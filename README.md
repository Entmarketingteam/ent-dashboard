# ENT Agency Creator Dashboard

## Setup (one human step, then Claude Code does everything)

```bash
# 1. Clone this repo and cd into it
# 2. Add your Airtable API key:
cp .env.example .env.local
# Edit .env.local → paste your Airtable personal access token
# (Get one from https://airtable.com/create/tokens with data.records:read/write scopes)

# 3. Let Claude Code build it:
claude /build
```

That's it. The `/build` command runs preflight checks, initializes the project, builds every file, and loops until `npm run build` passes clean.

## After Build
```bash
npm run dev           # Local dev
npx vercel --prod     # Deploy to Vercel
```
