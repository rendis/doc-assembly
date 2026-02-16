#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-doc_assembly}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"

docker run --rm --network host \
  -v "${SCRIPT_DIR}:/liquibase/changelog" \
  liquibase/liquibase \
  --url="jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}" \
  --username="${DB_USER}" \
  --password="${DB_PASSWORD}" \
  --changelog-file=changelog.master.xml \
  update
