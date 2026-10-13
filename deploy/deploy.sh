#!/usr/bin/env bash
# Build + (re)start NEYU Health. Run on the server from /var/www/neyu.
set -euo pipefail
cd /var/www/neyu
git pull origin japanese-style
npm ci
npx prisma generate
npx prisma db push            # applies schema changes to the SQLite file in DATABASE_URL
npm run build
# standalone build needs static files + public next to server.js
cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/ && cp .env .next/standalone/.env
pm2 reload neyu-health || pm2 start deploy/ecosystem.config.js
pm2 save
echo "Deployed: $(git rev-parse --short HEAD)"
