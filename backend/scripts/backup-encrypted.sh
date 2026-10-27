#!/usr/bin/env bash
# B23: streaming encrypted PostgreSQL custom archive with restrictive permissions.
# Requires pg_dump and age; libpq connects via PGHOST, PGUSER, PGPASSFILE, PGDATABASE.
set -euo pipefail
umask 077
die(){ echo "Backup refused: $1" >&2; exit 2; }
[[ $# -eq 1 ]] || die "usage: B23_BACKUP_RECIPIENT=age1... PGDATABASE=... bash backup-encrypted.sh <new-file.age>"
[[ -n "${PGDATABASE:-}" ]] || die "PGDATABASE missing"
[[ ${B23_BACKUP_RECIPIENT:-} =~ ^age1[a-z0-9]{40,}$ ]] || die "age recipient missing/invalid"
command -v age >/dev/null && command -v pg_dump >/dev/null || die "pg_dump and age are required"
destination=$1
[[ ! -e "$destination" && ! -L "$destination" ]] || die "target must not already exist"
parent=$(dirname "$destination")
[[ -d "$parent" ]] || die "destination directory missing"
tempdir=$(mktemp -d "$parent/.advibe-backup-XXXXXXXX")
temp="$tempdir/archive.age"
trap 'rm -rf "$tempdir"' EXIT
# No unencrypted copy touches disk. Provider-native continuous PITR is separately required.
pg_dump --format=custom --no-owner --no-acl --dbname="$PGDATABASE" |
 age -r "$B23_BACKUP_RECIPIENT" -o "$temp"
[[ $(head -c 21 "$temp") == "age-encryption.org/v1" ]] || die "encrypted archive header invalid"
chmod 600 "$temp"
ln "$temp" "$destination"  # atomic exclusive creation; prevents overwriting existing archives
rm -rf "$tempdir"
trap - EXIT
echo "Encrypted backup archived. Perform a separate isolated restore drill before signoff."
