#!/usr/bin/env bash
# B23: restore to a dedicated disposable database; never point at live Neon/production.
set -euo pipefail
umask 077
die(){ echo "Restore refused: $1" >&2; exit 2; }
[[ $# -eq 1 && -f $1 ]] || die "usage: B23_AGE_IDENTITY_FILE=... PGDATABASE=advibe_b23_restore B23_RESTORE_ACK=YES_DISPOSABLE_DATABASE bash restore-drill.sh <archive.age>"
[[ ${PGDATABASE:-} =~ ^advibe_[a-z0-9_]+_(restore|drill|ci)$ ]] ||
 die "PGDATABASE must name a disposable advibe_*_restore/drill/ci database"
[[ ${B23_RESTORE_ACK:-} == YES_DISPOSABLE_DATABASE ]] || die "explicit disposable-database acknowledgement required"
[[ -r ${B23_AGE_IDENTITY_FILE:-/missing} ]] || die "approved age identity file required"
[[ ${PGHOST:-} != "" ]] || die "explicit PGHOST required"
command -v age >/dev/null && command -v pg_restore >/dev/null && command -v psql >/dev/null ||
 die "age, pg_restore and psql are required"
# The disposable database must be empty and pre-created by a separate operator.
# No --clean, DROP DATABASE or destructive schema rewrites.
count=$(psql --no-psqlrc --set ON_ERROR_STOP=on -Atqc  "SELECT count(*) FROM pg_class WHERE relkind='r' AND relnamespace='public'::regnamespace" "$PGDATABASE")
[[ $count == 0 ]] || die "restore database is not empty"
age -d -i "$B23_AGE_IDENTITY_FILE" "$1" |
 pg_restore --exit-on-error --no-owner --no-acl --dbname="$PGDATABASE"
psql --no-psqlrc --set ON_ERROR_STOP=on "$PGDATABASE" -Atqc  "SELECT CASE WHEN to_regclass('public.\"User\"') IS NOT NULL AND to_regclass('public.\"_prisma_migrations\"') IS NOT NULL THEN 'OK' ELSE 'MISSING' END" |
 grep -qx OK || die "restored schema smoke failed"
echo "Restore-drill schema probe passed. Record timestamp, RPO/RTO and a sanitized evidence ID."
