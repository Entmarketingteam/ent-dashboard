#!/bin/bash
# ================================================================
# ENT Dashboard — Preflight Check
# ================================================================
# This script verifies everything is ready for Claude Code to build.
# It fixes what it can automatically and gives ONE specific human
# instruction if something requires manual action.
#
# Exit codes:
#   0 = All clear, proceed to build
#   1 = Human action required (printed to stdout)
# ================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }
human_action() {
  echo ""
  echo "================================================================"
  echo -e "${RED}HUMAN ACTION REQUIRED${NC}"
  echo "================================================================"
  echo ""
  echo "$1"
  echo ""
  echo "After completing this, run this script again."
  echo "================================================================"
  exit 1
}

echo "ENT Dashboard — Preflight Check"
echo "================================"
echo ""

# ────────────────────────────────────────────────────────────────
# 1. Check Node.js
# ────────────────────────────────────────────────────────────────
if ! command -v node &> /dev/null; then
  human_action "Install Node.js 18+:
  
  Mac:   brew install node
  Other: https://nodejs.org/en/download"
fi
NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  human_action "Upgrade Node.js to version 18 or higher. Current: $(node -v)
  
  Mac:   brew upgrade node
  Other: https://nodejs.org/en/download"
fi
pass "Node.js $(node -v)"

# ────────────────────────────────────────────────────────────────
# 2. Check / Create .env.local
# ────────────────────────────────────────────────────────────────
if [ ! -f .env.local ]; then
  if [ -f .env.example ]; then
    cp .env.example .env.local
    warn "Created .env.local from .env.example"
  else
    cat > .env.local << 'ENVEOF'
AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=appQnKyfyRyhHX44h
LTK_AUTH_URL=https://creator-auth.shopltk.com/oauth/token
LTK_CLIENT_ID=iKyQz7GfBMBPqUqCbbKSNBUlM2VpNWUT
LTK_API_GATEWAY=https://api-gateway.rewardstyle.com
LTK_CREATOR_API=https://creator-api-gateway.shopltk.com/v1
CRON_SECRET=
ENVEOF
    warn "Created .env.local with defaults"
  fi
fi

# Source .env.local
set -a
source .env.local 2>/dev/null || true
set +a

# ────────────────────────────────────────────────────────────────
# 3. Check Airtable API Key
# ────────────────────────────────────────────────────────────────
if [ -z "$AIRTABLE_API_KEY" ] || [[ "$AIRTABLE_API_KEY" == *"REPLACE"* ]] || [[ "$AIRTABLE_API_KEY" == "pat_"* && ${#AIRTABLE_API_KEY} -lt 20 ]]; then
  
  # Try 1Password CLI if available
  if command -v op &> /dev/null; then
    warn "Attempting to pull Airtable key from 1Password..."
    AT_KEY=$(op item get "Airtable" --fields api_key 2>/dev/null || op item get "Airtable API Key" --fields api_key 2>/dev/null || op item get "Airtable API" --fields credential 2>/dev/null || echo "")
    if [ -n "$AT_KEY" ] && [ "$AT_KEY" != "" ]; then
      sed -i.bak "s|^AIRTABLE_API_KEY=.*|AIRTABLE_API_KEY=$AT_KEY|" .env.local
      export AIRTABLE_API_KEY="$AT_KEY"
      pass "Pulled Airtable API key from 1Password"
    fi
  fi
  
  # Still empty? Human action needed.
  if [ -z "$AIRTABLE_API_KEY" ] || [[ "$AIRTABLE_API_KEY" == *"REPLACE"* ]]; then
    human_action "Add your Airtable Personal Access Token to .env.local:

1. Go to https://airtable.com/create/tokens
2. Click 'Create new token'
3. Name: 'ENT Dashboard'
4. Scopes: data.records:read, data.records:write, schema.bases:read, schema.bases:write  
5. Access: Grant to base 'Claude Created LTK and AMAZON EARNINGS'
6. Copy the token (starts with 'pat')
7. Open .env.local in this folder and paste it as the AIRTABLE_API_KEY value"
  fi
fi
pass "Airtable API key present"

# ────────────────────────────────────────────────────────────────
# 4. Check Airtable connectivity + table structure
# ────────────────────────────────────────────────────────────────
echo ""
echo "Checking Airtable..."

AT_RESPONSE=$(curl -s -w "\n%{http_code}" \
  "https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/LTK_Credentials?maxRecords=1" \
  -H "Authorization: Bearer ${AIRTABLE_API_KEY}" \
  -H "Content-Type: application/json" 2>/dev/null)

AT_HTTP_CODE=$(echo "$AT_RESPONSE" | tail -1)
AT_BODY=$(echo "$AT_RESPONSE" | sed '$d')

if [ "$AT_HTTP_CODE" = "401" ] || [ "$AT_HTTP_CODE" = "403" ]; then
  human_action "Your Airtable API key is invalid or doesn't have access to the base.

1. Go to https://airtable.com/create/tokens
2. Edit your token or create a new one
3. Make sure it has scopes: data.records:read, data.records:write
4. Make sure it has access to base 'Claude Created LTK and AMAZON EARNINGS' (ID: appQnKyfyRyhHX44h)
5. Update AIRTABLE_API_KEY in .env.local"
fi

if [ "$AT_HTTP_CODE" = "404" ] || [ "$AT_HTTP_CODE" = "422" ]; then
  warn "Table 'LTK_Credentials' not found. Attempting to check with table ID..."
  
  # Try by table ID
  AT_RESPONSE2=$(curl -s -w "\n%{http_code}" \
    "https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/tbl5TEfzBwGPeT1rX?maxRecords=1" \
    -H "Authorization: Bearer ${AIRTABLE_API_KEY}" 2>/dev/null)
  AT_HTTP_CODE2=$(echo "$AT_RESPONSE2" | tail -1)
  
  if [ "$AT_HTTP_CODE2" = "200" ]; then
    pass "Found table by ID (tbl5TEfzBwGPeT1rX)"
    # Update env to use table ID instead of name
    AT_BODY=$(echo "$AT_RESPONSE2" | sed '$d')
  else
    warn "Could not find LTK_Credentials table. Will create during build."
  fi
fi

if [ "$AT_HTTP_CODE" = "200" ]; then
  pass "Airtable connection successful"
  
  # Check if we got any records
  RECORD_COUNT=$(echo "$AT_BODY" | grep -o '"id"' | wc -l | tr -d ' ')
  if [ "$RECORD_COUNT" -gt 0 ]; then
    pass "Found $RECORD_COUNT creator record(s)"
    
    # Check for refresh token
    HAS_REFRESH=$(echo "$AT_BODY" | grep -o '"Refresh_Token"' | wc -l | tr -d ' ')
    if [ "$HAS_REFRESH" -gt 0 ]; then
      REFRESH_VALUE=$(echo "$AT_BODY" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for r in data.get('records', []):
        rt = r.get('fields', {}).get('Refresh_Token', '')
        if rt:
            print(rt[:20] + '...')
            break
    else:
        print('EMPTY')
except:
    print('PARSE_ERROR')
" 2>/dev/null || echo "PARSE_ERROR")
      
      if [ "$REFRESH_VALUE" = "EMPTY" ] || [ "$REFRESH_VALUE" = "PARSE_ERROR" ] || [ -z "$REFRESH_VALUE" ]; then
        warn "Refresh token field exists but is empty. Token will need to be added."
        echo ""
        warn "The dashboard will build fine, but LTK API calls won't work until a token is provided."
        warn "After build, go to /settings on the dashboard for re-auth instructions."
      else
        pass "Found refresh token: ${REFRESH_VALUE}"
      fi
    else
      warn "No Refresh_Token field found. Will check/create during build."
    fi
  else
    warn "No creator records found. Will create default Nicki record during build."
  fi
fi

# ────────────────────────────────────────────────────────────────
# 5. Generate CRON_SECRET if missing
# ────────────────────────────────────────────────────────────────
if [ -z "$CRON_SECRET" ]; then
  CRON_SECRET=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | head -c 32 | xxd -p 2>/dev/null || echo "default-cron-secret-$(date +%s)")
  if grep -q "^CRON_SECRET=" .env.local; then
    sed -i.bak "s|^CRON_SECRET=.*|CRON_SECRET=$CRON_SECRET|" .env.local
  else
    echo "CRON_SECRET=$CRON_SECRET" >> .env.local
  fi
  pass "Generated CRON_SECRET"
else
  pass "CRON_SECRET present"
fi

# ────────────────────────────────────────────────────────────────
# 6. Clean up .bak files
# ────────────────────────────────────────────────────────────────
rm -f .env.local.bak 2>/dev/null

# ────────────────────────────────────────────────────────────────
# Summary
# ────────────────────────────────────────────────────────────────
echo ""
echo "================================"
echo -e "${GREEN}PREFLIGHT PASSED${NC} — Ready to build"
echo "================================"
echo ""
exit 0
