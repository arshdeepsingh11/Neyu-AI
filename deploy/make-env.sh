#!/usr/bin/env bash
# NEYU Health — write the production settings file for the PostgreSQL version (one time, Phase 9).
#
#   APP=/var/www/neyu-new bash deploy/make-env.sh /var/www/neyu/.env   (go-live: new code in neyu-new, old live .env)
#   bash deploy/make-env.sh                                    (new server, nothing to carry over)
#
# Writes $APP/.env (or $APP/.env.new if a .env is already there — it never overwrites one), and
# creates the PostgreSQL user + database "neyu" (asks for sudo). Then fill the lines it lists as EMPTY.
set -euo pipefail
APP="${APP:-/var/www/neyu}"   # APP=/var/www/neyu-new bash deploy/... to use another folder
OLD="${1:-}"
OUT="$APP/.env"; [ -e "$OUT" ] && OUT="$APP/.env.new"
EX="$APP/deploy/env.production.example"
[ -f "$EX" ] || { echo "✗ $EX not found — run this from the updated code"; exit 1; }
[ -z "$OLD" ] || [ -f "$OLD" ] || { echo "✗ old .env not found: $OLD"; exit 1; }
[ -e "$OUT" ] && { echo "✗ $OUT already exists — delete it first if you want a fresh one"; exit 1; }

old() { [ -n "$OLD" ] && grep -E "^\s*$1=" "$OLD" | tail -1 | cut -d= -f2- | sed -e 's/^\s*//' -e 's/\s*$//' -e 's/^["'\'']//' -e 's/["'\'']$//' || true; }
gen() { openssl rand -hex 32; }
declare -A V SRC

# Carried over from the old server (same Gemini key, wearable keys, sign-up switch).
for k in GEMINI_API_KEY GEMINI_MODEL PORTAL_SIGNUP_OPEN WITHINGS_CLIENT_ID WITHINGS_CLIENT_SECRET OURA_CLIENT_ID OURA_CLIENT_SECRET \
         WHOOP_CLIENT_ID WHOOP_CLIENT_SECRET IOS_SHORTCUT_URL; do
  v="$(old $k)"; [ -n "$v" ] && { V[$k]="$v"; SRC[$k]="carried over"; }
done
# TOKEN_ENC_KEY MUST stay the same, or saved wearable sign-ins can't be opened. The old code used
# ADMIN_SESSION_SECRET when TOKEN_ENC_KEY was empty, so that value becomes the key in that case.
if [ -n "$(old TOKEN_ENC_KEY)" ]; then V[TOKEN_ENC_KEY]="$(old TOKEN_ENC_KEY)"; SRC[TOKEN_ENC_KEY]="carried over (must not change)"
elif [ -n "$(old ADMIN_SESSION_SECRET)" ]; then V[TOKEN_ENC_KEY]="$(old ADMIN_SESSION_SECRET)"; SRC[TOKEN_ENC_KEY]="old ADMIN_SESSION_SECRET (the old key — must not change)"
else V[TOKEN_ENC_KEY]="$(gen)"; SRC[TOKEN_ENC_KEY]="generated (new server)"; fi

# New random secrets (signing everyone out of the admin console once is fine).
for k in ADMIN_PASSWORD ADMIN_SESSION_SECRET CRON_SECRET METRICS_TOKEN; do V[$k]="$(gen)"; SRC[$k]="generated"; done

# Database: user "neyu" with a new random password, local only.
DBPASS="$(gen)"
V[DATABASE_URL]="\"postgresql://neyu:$DBPASS@localhost:5432/neyu?schema=public&connection_limit=10&pool_timeout=20\""
if sudo -u postgres psql -tAc "select 1 from pg_roles where rolname='neyu'" | grep -q 1; then
  sudo -u postgres psql -q -c "ALTER USER neyu WITH PASSWORD '$DBPASS';"
  SRC[DATABASE_URL]="existing user neyu — password reset to a new one"
else
  sudo -u postgres psql -q -c "CREATE USER neyu WITH PASSWORD '$DBPASS';"
  SRC[DATABASE_URL]="user neyu created"
fi
if ! sudo -u postgres psql -tAc "select 1 from pg_database where datname='neyu'" | grep -q 1; then
  sudo -u postgres psql -q -c "CREATE DATABASE neyu OWNER neyu;"; SRC[DATABASE_URL]+=", database neyu created"
fi
sudo -u postgres psql -q -d neyu -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;" 2>/dev/null || true

# Write the file: the example with our values filled in.
umask 077
while IFS= read -r line; do
  if [[ "$line" =~ ^([A-Z0-9_]+)= ]] && [ -n "${V[${BASH_REMATCH[1]}]+x}" ]; then echo "${BASH_REMATCH[1]}=${V[${BASH_REMATCH[1]}]}"; else echo "$line"; fi
done < "$EX" > "$OUT"
chmod 600 "$OUT"

echo; echo "✓ Wrote $OUT"
for k in "${!SRC[@]}"; do printf '  %-22s %s\n' "$k" "${SRC[$k]}"; done | sort
echo; echo "EMPTY — fill these in $OUT before go-live:"
for k in SMTP_PASS SUPER_ADMIN_USERNAME SUPER_ADMIN_PASSWORD GEMINI_API_KEY; do
  grep -qE "^$k=.+" "$OUT" || echo "  $k"
done
echo "  (optional, later: FIREBASE_SERVICE_ACCOUNT, APNS_* for app notifications)"
[ "$OUT" = "$APP/.env.new" ] && echo "Then compare with .env and: mv $OUT $APP/.env && chmod 600 $APP/.env"
echo "Edit with: nano $OUT"
