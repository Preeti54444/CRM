#!/usr/bin/env bash
# Simple PostgreSQL backup using DATABASE_URL from environment
set -euo pipefail

BACKUP_DIR=${BACKUP_DIR:-/backups}
mkdir -p "$BACKUP_DIR"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL must be set in the environment"
  exit 2
fi

FNAME="$BACKUP_DIR/db-$(date +%F).dump"

echo "Starting pg_dump to $FNAME"
pg_dump --format=custom --file="$FNAME" "$DATABASE_URL"

echo "Backup completed: $FNAME"
# Optional: remove backups older than 14 days
find "$BACKUP_DIR" -type f -name 'db-*.dump' -mtime +14 -delete
