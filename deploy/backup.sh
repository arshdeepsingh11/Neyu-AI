#!/usr/bin/env bash
# Daily database backup (keeps 30 days). Cron: 15 2 * * * /var/www/neyu/deploy/backup.sh
set -euo pipefail
mkdir -p /var/backups/neyu
sqlite3 /var/lib/neyu/neyu.db ".backup '/var/backups/neyu/neyu-$(date +%F).db'"
find /var/backups/neyu -name 'neyu-*.db' -mtime +30 -delete
