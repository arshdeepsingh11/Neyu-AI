#!/usr/bin/env bash
# Daily backup: PostgreSQL database + patient report files (keeps 30 days).
#   One-time setup:  sudo mkdir -p /var/backups/neyu && sudo chown "$USER" /var/backups/neyu && chmod 700 /var/backups/neyu
#   Cron (app user): 15 2 * * * bash /var/www/neyu/deploy/backup.sh >> /var/backups/neyu/backup.log 2>&1
#   Restore test (monthly, on a spare database — never on the live one):
#     sudo -u postgres createdb neyu_restore_test
#     sudo -u postgres pg_restore --no-owner -d neyu_restore_test /var/backups/neyu/neyu-YYYY-MM-DD.dump
#     sudo -u postgres psql -d neyu_restore_test -c 'select count(*) from "Patient"'   → same number as live
#     sudo -u postgres dropdb neyu_restore_test
# Report files are already encrypted with TOKEN_ENC_KEY. Keep a copy of .env in the company password
# manager (not next to these backups) — without TOKEN_ENC_KEY the files can't be opened.
set -euo pipefail
APP=/var/www/neyu
OUT=/var/backups/neyu
val() { grep -E "^\s*$1=" "$APP/.env" | tail -1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//'; }
DATABASE_URL="$(val DATABASE_URL | sed 's/[?].*$//')"
STORAGE_DIR="$(val STORAGE_DIR)"; STORAGE_DIR="${STORAGE_DIR:-/var/lib/neyu/storage}"
DAY="$(date +%F)"
[ -d "$OUT" ] && [ -w "$OUT" ] || { echo "✗ $OUT is missing or not writable — see the one-time setup at the top of this file."; exit 1; }

pg_dump --format=custom --compress=9 --no-owner --file="$OUT/neyu-$DAY.dump.part" "$DATABASE_URL"
mv "$OUT/neyu-$DAY.dump.part" "$OUT/neyu-$DAY.dump"
if [ -d "$STORAGE_DIR" ]; then
  tar -czf "$OUT/files-$DAY.tar.gz.part" -C "$(dirname "$STORAGE_DIR")" "$(basename "$STORAGE_DIR")"
  mv "$OUT/files-$DAY.tar.gz.part" "$OUT/files-$DAY.tar.gz"
fi
find "$OUT" -name 'neyu-*.dump' -mtime +30 -delete
find "$OUT" -name 'files-*.tar.gz' -mtime +30 -delete
echo "$(date '+%F %T') ✓ backup $DAY: $(du -h "$OUT/neyu-$DAY.dump" | cut -f1) database, $( [ -f "$OUT/files-$DAY.tar.gz" ] && du -h "$OUT/files-$DAY.tar.gz" | cut -f1 || echo 0) files"
# A backup on the same disk is not a backup: copy $OUT to another machine or cloud storage every day
# (rsync/rclone, run after this script).
