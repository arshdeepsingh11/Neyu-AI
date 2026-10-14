#!/usr/bin/env bash
# Build + (re)start NEYU Health. Run on the server from /var/www/neyu.
#   bash deploy/deploy.sh                 (deploys the japanese-style branch)
#   BRANCH=test bash deploy/deploy.sh     (any other branch)
set -euo pipefail
cd /var/www/neyu
BRANCH="${BRANCH:-japanese-style}"
git pull origin "$BRANCH"
npm ci
npx prisma generate
npx prisma migrate deploy     # applies only new, versioned migrations (PostgreSQL) — never drops data
npm run build
# standalone build needs static files + public next to server.js
cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/ && cp .env .next/standalone/.env
pm2 reload neyu-health || pm2 start deploy/ecosystem.config.js
pm2 save
echo "Deployed $BRANCH: $(git rev-parse --short HEAD)"
