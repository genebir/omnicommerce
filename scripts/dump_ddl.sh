#!/bin/bash
# 현재 DB 스키마를 DDL SQL 파일로 추출합니다.
# 사용법: ./scripts/dump_ddl.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT="$PROJECT_ROOT/scripts/schema.sql"

PGPASSWORD='omni_secure_2026!' pg_dump \
  -h localhost -p 5432 -U omni_user -d omni_commerce \
  --schema-only \
  --no-owner \
  --no-privileges \
  --no-tablespaces \
  --no-comments \
  -T alembic_version \
  > "$OUTPUT"

echo "DDL 덤프 완료: $OUTPUT"
echo "테이블 수: $(grep -c 'CREATE TABLE' "$OUTPUT")"
