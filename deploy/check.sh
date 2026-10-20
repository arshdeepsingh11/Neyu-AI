#!/usr/bin/env bash
# NEYU Health — server check. Safe to run any time (reads only, changes nothing).
#   bash deploy/check.sh          before go-live: is the server ready?   after: is the site healthy?
# ✓ = fine · ! = look at it · ✗ = must be fixed. Exit code 1 when anything is ✗.
set -uo pipefail
APP="${APP:-/var/www/neyu}"   # APP=/var/www/neyu-new bash deploy/... to use another folder
ENVF="$APP/.env"
FAIL=0; WARN=0
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; WARN=$((WARN+1)); }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$*"; FAIL=$((FAIL+1)); }
head_() { printf '\n\033[1m%s\033[0m\n' "$*"; }
val()  { [ -f "$ENVF" ] && grep -E "^\s*$1=" "$ENVF" | tail -1 | cut -d= -f2- | sed -e 's/^\s*//' -e 's/\s*$//' -e 's/^["'\'']//' -e 's/["'\'']$//'; }
has()  { command -v "$1" >/dev/null 2>&1; }

head_ "1 · Software"
. /etc/os-release 2>/dev/null; ok "OS: ${PRETTY_NAME:-unknown}"
if has node; then
  NV=$(node -p 'process.versions.node.split(".")[0]')
  if [ "$NV" -ge 22 ]; then ok "Node $(node -v)"; elif [ "$NV" -ge 20 ]; then warn "Node $(node -v) works, but Node 20 is out of support — install Node 22"; else bad "Node $(node -v) is too old — install Node 22"; fi
else bad "Node.js is not installed"; fi
for c in npm git pm2 nginx psql pg_dump redis-cli openssl curl; do has "$c" && ok "$c found" || bad "$c is not installed"; done
if has pg_dump; then PGV=$(pg_dump --version | grep -oE '[0-9]+' | head -1); [ "$PGV" -ge 16 ] && ok "pg_dump version $PGV" || bad "pg_dump is version $PGV — install postgresql-client-16 (backups must match the server)"; fi

head_ "2 · Settings file ($ENVF)"
if [ ! -f "$ENVF" ]; then bad ".env is missing — copy deploy/env.production.example to $ENVF and fill it in"
else
  P=$(stat -c %a "$ENVF"); [ "$P" = "600" ] && ok ".env permissions 600" || bad ".env permissions are $P — run: chmod 600 $ENVF"
  grep -nE '^\s+[A-Z_]+=' "$ENVF" >/dev/null && warn ".env has lines starting with spaces — remove the spaces"
  grep -q $'\r' "$ENVF" && bad ".env has Windows line endings — run: sed -i 's/\\r$//' $ENVF"
  for k in NODE_ENV PUBLIC_BASE_URL NEXT_PUBLIC_SITE_URL DATABASE_URL GEMINI_API_KEY ADMIN_SESSION_SECRET TOKEN_ENC_KEY CRON_SECRET \
           SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS MAIL_FROM SUPER_ADMIN_USERNAME SUPER_ADMIN_PASSWORD REDIS_URL STORAGE_DIR; do
    v="$(val $k)"; [ -n "$v" ] && ok "$k is set" || bad "$k is empty"
  done
  grep -q 'CHANGE_ME' "$ENVF" && bad "DATABASE_URL still contains CHANGE_ME"
  [ "$(val NODE_ENV)" = "production" ] || bad "NODE_ENV must be production"
  [[ "$(val DATABASE_URL)" =~ ^postgres(ql)?:// ]] || bad "DATABASE_URL must start with postgresql:// (the SQLite file is only for the one-time import)"
  [[ "$(val PUBLIC_BASE_URL)" == https://* ]] || warn "PUBLIC_BASE_URL should be https://neyuhealth.com (used in email links)"
  L=$(val SUPER_ADMIN_PASSWORD | tr -d '\n' | wc -c); [ "$L" -ge 12 ] || bad "SUPER_ADMIN_PASSWORD must be at least 12 characters"
  for k in ADMIN_SESSION_SECRET CRON_SECRET; do [ "$(val $k | wc -c)" -ge 33 ] || warn "$k is short — use: openssl rand -hex 32"; done
  [[ "$(val MAIL_FROM)" == *resend.dev* ]] && bad "MAIL_FROM uses Resend's test sender — it only reaches the Resend account owner. Use no-reply@neyuhealth.com"
  SD="$(val STORAGE_DIR)"
  if [ -n "$SD" ]; then
    [[ "$SD" == /* ]] || bad "STORAGE_DIR must be an absolute path (e.g. /var/lib/neyu/storage)"
    [[ "$SD" == "$APP"* ]] && bad "STORAGE_DIR must be outside $APP (deploys would wipe it)"
    if [ -d "$SD" ] && [ -w "$SD" ]; then ok "STORAGE_DIR exists and is writable"; else bad "STORAGE_DIR $SD is missing or not writable by $(whoami)"; fi
  fi
fi

head_ "3 · Database and Redis"
DBURL="$(val DATABASE_URL | sed 's/[?].*$//')"
if [ -n "$DBURL" ] && has psql; then
  if psql "$DBURL" -tAc 'select 1' >/dev/null 2>&1; then
    ok "PostgreSQL: connected ($(psql "$DBURL" -tAc 'show server_version' 2>/dev/null))"
    T=$(psql "$DBURL" -tAc "select count(*) from information_schema.tables where table_schema='public'" 2>/dev/null)
    [ "${T:-0}" -gt 50 ] && ok "PostgreSQL: $T tables" || warn "PostgreSQL: $T tables — migrations not applied yet (npx prisma migrate deploy)"
    if [ "${T:-0}" -gt 50 ]; then
      ok "PostgreSQL: $(psql "$DBURL" -tAc 'select count(*) from "Patient"' 2>/dev/null) patients, $(psql "$DBURL" -tAc 'select count(*) from "StaffUser"' 2>/dev/null) staff accounts"
      PENDING=$(psql "$DBURL" -tAc "select count(*) from \"HealthDocument\" where \"storageKey\" is null and data is not null" 2>/dev/null)
      [ "${PENDING:-0}" = "0" ] && ok "Report files: all in file storage" || warn "Report files: $PENDING still inside the database — run: npm run storage:move"
    fi
    # TOKEN_ENC_KEY must be the same key that encrypted the existing data (old server's value).
    KEY="$(val TOKEN_ENC_KEY)"; KEY="${KEY:-$(val ADMIN_SESSION_SECRET)}"
    TOK=$(psql "$DBURL" -tAc "select \"accessTokenEnc\" from \"DeviceConnection\" where \"accessTokenEnc\" like 'v1.%' limit 1" 2>/dev/null)
    FILE=$(find "$(val STORAGE_DIR)" -type f ! -name '*.tmp-*' 2>/dev/null | head -1)
    if [ -n "$TOK$FILE" ]; then
      R=$(K="$KEY" T="$TOK" F="$FILE" node -e '
        const c=require("crypto"),fs=require("fs"),K=process.env.K;let out=[];
        try{ if(process.env.T){const[v,iv,tag,d]=process.env.T.split(".");const x=c.createDecipheriv("aes-256-gcm",c.createHash("sha256").update(K).digest(),Buffer.from(iv,"base64url"));x.setAuthTag(Buffer.from(tag,"base64url"));Buffer.concat([x.update(Buffer.from(d,"base64url")),x.final()]);out.push("token")} }catch{console.log("BAD token");process.exit()}
        try{ if(process.env.F){const b=fs.readFileSync(process.env.F);if(b.subarray(0,5).toString()==="NEYU1"){const x=c.createDecipheriv("aes-256-gcm",c.createHash("sha256").update("storage:"+K).digest(),b.subarray(5,17));x.setAuthTag(b.subarray(17,33));Buffer.concat([x.update(b.subarray(33)),x.final()])}out.push("file")} }catch{console.log("BAD file");process.exit()}
        console.log("OK "+out.join(" + "))' 2>&1)
      [[ "$R" == OK* ]] && ok "TOKEN_ENC_KEY opens existing encrypted data (${R#OK })" || bad "TOKEN_ENC_KEY can't open existing data ($R) — it must be the OLD server's key"
    fi
    psql "$DBURL" -tAc "show shared_preload_libraries" 2>/dev/null | grep -q pg_stat_statements && ok "PostgreSQL tuning file is active" || warn "PostgreSQL tuning file not active (deploy/postgresql-neyu.conf)"
  else bad "PostgreSQL: can't connect with DATABASE_URL"; fi
fi
RURL="$(val REDIS_URL)"
if [ -n "$RURL" ] && has redis-cli; then
  if [ "$(redis-cli -u "$RURL" ping 2>/dev/null)" = "PONG" ]; then
    ok "Redis: connected"
    POL=$(redis-cli -u "$RURL" config get maxmemory-policy 2>/dev/null | tail -1)
    [ "$POL" = "noeviction" ] && ok "Redis: maxmemory-policy noeviction" || bad "Redis maxmemory-policy is '$POL' — background jobs need noeviction (/etc/redis/redis.conf)"
  else bad "Redis: no answer at REDIS_URL"; fi
fi

head_ "4 · Internet access from this server"
tcp() { timeout 6 bash -c "exec 3<>/dev/tcp/$1/$2" 2>/dev/null; }
SH="$(val SMTP_HOST)"; SP="$(val SMTP_PORT)"
for hp in registry.npmjs.org:443 binaries.prisma.sh:443 github.com:443 fonts.googleapis.com:443 fonts.gstatic.com:443 \
          generativelanguage.googleapis.com:443 "${SH:-smtp.resend.com}:${SP:-465}"; do
  tcp "${hp%%:*}" "${hp##*:}" && ok "can reach $hp" || bad "can't reach $hp (firewall?)"
done

head_ "5 · Disk, memory, backups"
FREE=$(df -BG --output=avail "$APP" 2>/dev/null | tail -1 | tr -dc 0-9); [ "${FREE:-0}" -ge 10 ] && ok "disk: ${FREE} GB free" || warn "disk: only ${FREE:-?} GB free"
MEM=$(free -m | awk '/Mem:/{print $2}'); [ "$MEM" -ge 3800 ] && ok "memory: ${MEM} MB" || warn "memory: ${MEM} MB — 4 GB recommended"
[ "$(free -m | awk '/Swap:/{print $2}')" -gt 0 ] && ok "swap is on" || warn "no swap — add 2 GB so the build can't run out of memory"
[ -d /var/backups/neyu ] && [ -w /var/backups/neyu ] && ok "/var/backups/neyu is writable" || bad "/var/backups/neyu missing or not writable (see deploy/backup.sh)"
crontab -l 2>/dev/null | grep -q 'deploy/backup.sh' && ok "daily backup is in crontab" || warn "daily backup not in crontab yet"
LAST=$(ls -t /var/backups/neyu/neyu-*.dump 2>/dev/null | head -1); [ -n "$LAST" ] && ok "latest backup: $(basename "$LAST")" || warn "no backup file yet"

head_ "6 · App"
if has pm2 && pm2 jlist >/dev/null 2>&1; then
  ON=$(pm2 jlist | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=JSON.parse(s).filter(p=>p.name==="neyu-health");console.log(a.filter(p=>p.pm2_env.status==="online").length+"/"+a.length+" "+(a[0]?.pm2_env.exec_mode||""))})')
  case "$ON" in 0/0*) warn "app not started in PM2 yet";; 0/*) bad "PM2: no copy online ($ON)";; *) ok "PM2: $ON online";; esac
fi
H=$(curl -s --max-time 8 http://127.0.0.1:3000/api/v1/health)
if [[ "$H" == *'"status":"ok"'* ]]; then ok "app health: ok (local)"; elif [ -n "$H" ]; then bad "app health: $H"; else warn "app not answering on 127.0.0.1:3000"; fi

head_ "7 · Public site"
SITE="$(val PUBLIC_BASE_URL)"; SITE="${SITE:-https://neyuhealth.com}"; HOST="${SITE#https://}"; HOST="${HOST%%/*}"
for p in / /api/v1/health /privacy /robots.txt /sitemap.xml; do
  c=$(curl -s -o /dev/null --max-time 10 -w '%{http_code}' "$SITE$p"); [ "$c" = "200" ] && ok "$SITE$p → 200" || warn "$SITE$p → $c"
done
c=$(curl -s -o /dev/null --max-time 10 -w '%{http_code} %{redirect_url}' "http://$HOST/"); [[ "$c" == 301* ]] && ok "http → https redirect" || warn "http redirect: $c"
END=$(echo | timeout 8 openssl s_client -servername "$HOST" -connect "$HOST:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
if [ -n "$END" ]; then D=$(( ($(date -d "$END" +%s) - $(date +%s)) / 86400 )); [ "$D" -ge 14 ] && ok "HTTPS certificate valid for $D more days" || bad "HTTPS certificate ends in $D days"; else warn "couldn't read the HTTPS certificate"; fi

echo; if [ "$FAIL" -gt 0 ]; then printf '\033[31m%s must be fixed\033[0m, %s to look at.\n' "$FAIL" "$WARN"; exit 1; else printf '\033[32mNothing blocking\033[0m · %s to look at.\n' "$WARN"; fi
echo "Email check: cd $APP && npm run email:test -- someone@example.com"
