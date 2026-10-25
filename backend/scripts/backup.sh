#!/usr/bin/env bash
# Operator-initiated backup. Use approved retention and an encrypted destination.
set -euo pipefail
umask 077
if [[ $# -ne 1 || ! -v PG_DUMP_URL ]]; then
  echo "Usage: PG_DUMP_URL=<direct-libpq-url> bash backup.sh <new-backup.dump>" >&2
  exit 2
fi
if [[ -e "$1" ]]; then
  echo "Refusing to overwrite existing backup" >&2
  exit 2
fi
# Do not use Prisma-specific ?schema=public with libpq.
pg_dump --dbname="$PG_DUMP_URL" --format=custom --no-owner --no-acl --file="$1"
pg_restore --list "$1" >/dev/null
echo "Archive format verified; verify recovery by restoring into a disposable database."
