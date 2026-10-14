#!/usr/bin/env bash
# Daily PostgreSQL backup (compressed, keeps 30 days). Cron: 15 2 * * * /var/www/neyu/deploy/backup.sh
# Restore test (do monthly):  pg_restore --clean --if-exists -d "$DATABASE_URL" /var/backups/neyu/neyu-YYYY-MM-DD.dump
set -euo pipefail
DATABASE_URL="$(grep -E '^DATABASE_URL=' /var/www/neyu/.env | cut -d= -f2- | tr -d '"' | sed 's/[?].*$//')"
mkdir -p /var/backups/neyu && chmod 700 /var/backups/neyu
pg_dump --format=custom --compress=9 --no-owner --file="/var/backups/neyu/neyu-$(date +%F).dump" "$DATABASE_URL"
find /var/backups/neyu -name 'neyu-*.dump' -mtime +30 -delete
# Copy the newest dump off this server too (e.g. rclone/rsync to another site) — a backup on the same disk is not a backup.
