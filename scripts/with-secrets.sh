#!/bin/bash
# Runs a command with secrets injected.
# Tries Doppler first; falls back to .env.local if Doppler isn't configured.

if command -v doppler &> /dev/null && doppler secrets --only-names &> /dev/null 2>&1; then
  exec doppler run -- "$@"
else
  # Load .env.local if it exists
  if [ -f .env.local ]; then
    set -a
    source .env.local
    set +a
  fi
  exec "$@"
fi
