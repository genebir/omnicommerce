#!/usr/bin/env python3
"""앱 설정 시드 스크립트 — 멱등 실행 (CLAUDE.md §9.7).

사용법: python scripts/seed_settings.py
"""

import os
import subprocess
import sys

PG_HOST = os.getenv("PG_HOST", "localhost")
PG_PORT = os.getenv("PG_PORT", "5432")
APP_USER = "omni_user"
APP_PASS = "omni_secure_2026!"
APP_DB = "omni_commerce"

SEED_SQL = """
-- 채널 타입 시드
INSERT INTO channel_types (id, code, name, is_active, created_at, updated_at)
VALUES
    (gen_random_uuid(), 'cafe24', '카페24', true, now(), now()),
    (gen_random_uuid(), 'naver', '네이버 스마트스토어', true, now(), now()),
    (gen_random_uuid(), 'coupang', '쿠팡', true, now(), now())
ON CONFLICT (code) DO NOTHING;

-- 기본 앱 설정 시드 (CLAUDE.md §9.5 스키마 레지스트리와 1:1 매핑)
INSERT INTO app_settings (id, key, value, value_type, scope, description, is_secret, default_value, version, created_at, updated_at)
VALUES
    -- 카페24 설정
    (gen_random_uuid(), 'channel.cafe24.rate_limit', '{"requests_per_second": 5, "burst": 10}'::jsonb, 'json', 'global', '카페24 API 레이트리밋 설정', false, '{"requests_per_second": 5, "burst": 10}'::jsonb, 1, now(), now()),
    (gen_random_uuid(), 'channel.cafe24.polling_interval_sec', '{"value": 300}'::jsonb, 'int', 'global', '카페24 주문 폴링 주기(초)', false, '{"value": 300}'::jsonb, 1, now(), now()),
    -- 네이버 설정
    (gen_random_uuid(), 'channel.naver.rate_limit', '{"requests_per_second": 10, "burst": 20}'::jsonb, 'json', 'global', '네이버 API 레이트리밋 설정', false, '{"requests_per_second": 10, "burst": 20}'::jsonb, 1, now(), now()),
    (gen_random_uuid(), 'channel.naver.polling_interval_sec', '{"value": 180}'::jsonb, 'int', 'global', '네이버 주문 폴링 주기(초)', false, '{"value": 180}'::jsonb, 1, now(), now()),
    -- 쿠팡 설정
    (gen_random_uuid(), 'channel.coupang.rate_limit', '{"requests_per_second": 8, "burst": 15}'::jsonb, 'json', 'global', '쿠팡 API 레이트리밋 설정', false, '{"requests_per_second": 8, "burst": 15}'::jsonb, 1, now(), now()),
    (gen_random_uuid(), 'channel.coupang.polling_interval_sec', '{"value": 60}'::jsonb, 'int', 'global', '쿠팡 주문 폴링 주기(초)', false, '{"value": 60}'::jsonb, 1, now(), now()),
    -- 기능 플래그
    (gen_random_uuid(), 'features.bulk_upload_enabled', '{"value": false}'::jsonb, 'bool', 'global', '대량 업로드 기능 활성화 여부', false, '{"value": false}'::jsonb, 1, now(), now()),
    (gen_random_uuid(), 'features.new_dashboard_v2', '{"value": false}'::jsonb, 'bool', 'global', '새 대시보드 v2 활성화 여부', false, '{"value": false}'::jsonb, 1, now(), now()),
    -- UI 설정
    (gen_random_uuid(), 'ui.page_size_default', '{"value": 20}'::jsonb, 'int', 'global', '기본 페이지 사이즈', false, '{"value": 20}'::jsonb, 1, now(), now()),
    (gen_random_uuid(), 'ui.toast_duration_ms', '{"value": 4000}'::jsonb, 'int', 'global', '토스트 알림 표시 시간(ms)', false, '{"value": 4000}'::jsonb, 1, now(), now())
ON CONFLICT (key, scope) DO NOTHING;
"""


def main():
    env = os.environ.copy()
    env["PGPASSWORD"] = APP_PASS
    result = subprocess.run(
        [
            "psql",
            "-h",
            PG_HOST,
            "-p",
            PG_PORT,
            "-U",
            APP_USER,
            "-d",
            APP_DB,
            "-c",
            SEED_SQL,
        ],
        env=env,
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        print("시드 데이터 삽입 완료")
    else:
        print(f"시드 실패: {result.stderr}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
