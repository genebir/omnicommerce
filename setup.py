#!/usr/bin/env python3
"""OmniCommerce 원클릭 셋업 스크립트.

사용법:
    python setup.py              # 전체 셋업 (DB 생성 + 마이그레이션 + 시드)
    python setup.py --db-only    # DB/유저 생성만
    python setup.py --migrate    # 마이그레이션만
    python setup.py --seed       # 시드 데이터만
    python setup.py --reset      # DB 초기화 후 재생성

필수 환경:
    - PostgreSQL이 localhost:5432에 실행 중
    - postgres 슈퍼유저 접속 가능 (password: zxcv)
"""

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
API_DIR = PROJECT_ROOT / "apps" / "api"

# PostgreSQL 슈퍼유저 접속 정보
PG_HOST = "localhost"
PG_PORT = "5433"
PG_SUPERUSER = "postgres"
PG_SUPERPASS = "zxcv"

# 앱 전용 DB 정보
APP_DB = "omni_commerce"
APP_USER = "omni_user"
APP_PASS = "omni_secure_2026!"


def _psql_cmd(dbname: str, extra_flags: list[str]) -> tuple[list[str], dict]:
    """로컬 psql 또는 Docker 컨테이너 내 psql 명령을 반환한다 (자동 감지)."""
    env = os.environ.copy()

    # 로컬 psql 탐색 (brew libpq 경로 포함)
    local_psql = shutil.which("psql") or shutil.which(
        "/opt/homebrew/opt/libpq/bin/psql"
    ) or shutil.which("/usr/local/opt/libpq/bin/psql")

    if local_psql:
        env["PGPASSWORD"] = PG_SUPERPASS
        cmd = [
            local_psql,
            "-h", PG_HOST, "-p", PG_PORT,
            "-U", PG_SUPERUSER, "-d", dbname,
        ] + extra_flags
        return cmd, env

    # 로컬 psql 없음 → Docker 컨테이너 내 psql 사용
    # PGPASSWORD는 docker exec 환경에서 -e 플래그로 주입
    cmd = [
        "docker", "compose", "exec", "-T",
        "-e", f"PGPASSWORD={PG_SUPERPASS}",
        "postgres",
        "psql",
        "-U", PG_SUPERUSER, "-d", dbname,
    ] + extra_flags
    return cmd, env


def run_psql(sql: str, dbname: str = "postgres") -> bool:
    cmd, env = _psql_cmd(dbname, ["-c", sql])
    result = subprocess.run(cmd, env=env, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  [오류] {result.stderr.strip()}")
        return False
    return True


def run_psql_query(sql: str, dbname: str = "postgres") -> str:
    cmd, env = _psql_cmd(dbname, ["-t", "-A", "-c", sql])
    result = subprocess.run(cmd, env=env, capture_output=True, text=True)
    return result.stdout.strip()


def step_create_user():
    print("\n[1/5] 데이터베이스 유저 생성")
    exists = run_psql_query(f"SELECT 1 FROM pg_roles WHERE rolname = '{APP_USER}';")
    if exists == "1":
        print(f"  ✓ 유저 '{APP_USER}' 이미 존재")
    else:
        run_psql(f"CREATE ROLE {APP_USER} WITH LOGIN PASSWORD '{APP_PASS}';")
        print(f"  ✓ 유저 '{APP_USER}' 생성 완료")


def step_create_database():
    print("\n[2/5] 데이터베이스 생성")
    exists = run_psql_query(f"SELECT 1 FROM pg_database WHERE datname = '{APP_DB}';")
    if exists == "1":
        print(f"  ✓ DB '{APP_DB}' 이미 존재")
    else:
        run_psql(
            f"CREATE DATABASE {APP_DB} OWNER {APP_USER} ENCODING 'UTF8' "
            f"LOCALE_PROVIDER 'icu' ICU_LOCALE 'ko-KR' TEMPLATE template0;"
        )
        print(f"  ✓ DB '{APP_DB}' 생성 완료")

    run_psql(f"GRANT ALL PRIVILEGES ON DATABASE {APP_DB} TO {APP_USER};")
    run_psql(f"GRANT ALL ON SCHEMA public TO {APP_USER};", dbname=APP_DB)
    run_psql(
        f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO {APP_USER};",
        dbname=APP_DB,
    )
    run_psql(
        f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO {APP_USER};",
        dbname=APP_DB,
    )
    run_psql('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', dbname=APP_DB)
    run_psql('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";', dbname=APP_DB)
    print("  ✓ 권한 및 확장 설정 완료")


def step_create_env():
    print("\n[3/5] .env 파일 확인")
    env_file = PROJECT_ROOT / ".env"
    env_example = PROJECT_ROOT / ".env.example"
    if env_file.exists():
        print("  ✓ .env 파일 이미 존재")
    elif env_example.exists():
        import shutil

        shutil.copy(env_example, env_file)
        print("  ✓ .env.example → .env 복사 완료 (값을 확인하세요)")
    else:
        print("  ⚠ .env.example이 없습니다. 수동으로 .env를 생성하세요.")


def step_run_migrations():
    print("\n[4/5] Alembic 마이그레이션 실행")
    # uv run alembic: venv 내 alembic을 사용 (python -m alembic은 venv 외부 python이 실행될 수 있음)
    uv_bin = shutil.which("uv") or "uv"
    result = subprocess.run(
        [uv_bin, "run", "alembic", "upgrade", "head"],
        cwd=str(API_DIR),
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        print("  ✓ 마이그레이션 완료")
        for line in result.stderr.strip().split("\n"):
            if "Running upgrade" in line:
                print(f"    {line.strip()}")
    else:
        print(f"  [오류] 마이그레이션 실패:\n{result.stderr}")
        return False
    return True


def _run_app_psql(sql: str) -> subprocess.CompletedProcess:
    """앱 전용 유저(omni_user)로 psql 실행 — 로컬/Docker 자동 감지."""
    local_psql = shutil.which("psql") or shutil.which(
        "/opt/homebrew/opt/libpq/bin/psql"
    ) or shutil.which("/usr/local/opt/libpq/bin/psql")

    env = os.environ.copy()
    if local_psql:
        env["PGPASSWORD"] = APP_PASS
        cmd = [local_psql, "-h", PG_HOST, "-p", PG_PORT, "-U", APP_USER, "-d", APP_DB, "-c", sql]
    else:
        cmd = [
            "docker", "compose", "exec", "-T",
            "-e", f"PGPASSWORD={APP_PASS}",
            "postgres", "psql",
            "-U", APP_USER, "-d", APP_DB, "-c", sql,
        ]
    return subprocess.run(cmd, env=env, capture_output=True, text=True)


def step_seed_data():
    print("\n[5/5] 시드 데이터 삽입")
    seed_sql = """
    INSERT INTO channel_types (id, code, name, is_active, created_at, updated_at)
    VALUES
        (gen_random_uuid(), 'cafe24', '카페24', true, now(), now()),
        (gen_random_uuid(), 'naver', '네이버 스마트스토어', true, now(), now()),
        (gen_random_uuid(), 'coupang', '쿠팡', true, now(), now())
    ON CONFLICT (code) DO NOTHING;

    INSERT INTO app_settings (id, key, value, value_type, scope, description, is_secret, default_value, version, created_at, updated_at)
    VALUES
        (gen_random_uuid(), 'channel.cafe24.rate_limit', '{"requests_per_second": 5, "burst": 10}'::jsonb, 'json', 'global', '카페24 API 레이트리밋 설정', false, '{"requests_per_second": 5, "burst": 10}'::jsonb, 1, now(), now()),
        (gen_random_uuid(), 'channel.cafe24.polling_interval_sec', '{"value": 300}'::jsonb, 'int', 'global', '카페24 주문 폴링 주기(초)', false, '{"value": 300}'::jsonb, 1, now(), now()),
        (gen_random_uuid(), 'channel.naver.rate_limit', '{"requests_per_second": 10, "burst": 20}'::jsonb, 'json', 'global', '네이버 API 레이트리밋 설정', false, '{"requests_per_second": 10, "burst": 20}'::jsonb, 1, now(), now()),
        (gen_random_uuid(), 'channel.naver.polling_interval_sec', '{"value": 180}'::jsonb, 'int', 'global', '네이버 주문 폴링 주기(초)', false, '{"value": 180}'::jsonb, 1, now(), now()),
        (gen_random_uuid(), 'channel.coupang.rate_limit', '{"requests_per_second": 8, "burst": 15}'::jsonb, 'json', 'global', '쿠팡 API 레이트리밋 설정', false, '{"requests_per_second": 8, "burst": 15}'::jsonb, 1, now(), now()),
        (gen_random_uuid(), 'channel.coupang.polling_interval_sec', '{"value": 60}'::jsonb, 'int', 'global', '쿠팡 주문 폴링 주기(초)', false, '{"value": 60}'::jsonb, 1, now(), now()),
        (gen_random_uuid(), 'features.bulk_upload_enabled', '{"value": false}'::jsonb, 'bool', 'global', '대량 업로드 기능 활성화 여부', false, '{"value": false}'::jsonb, 1, now(), now()),
        (gen_random_uuid(), 'features.new_dashboard_v2', '{"value": false}'::jsonb, 'bool', 'global', '새 대시보드 v2 활성화 여부', false, '{"value": false}'::jsonb, 1, now(), now()),
        (gen_random_uuid(), 'ui.page_size_default', '{"value": 20}'::jsonb, 'int', 'global', '기본 페이지 사이즈', false, '{"value": 20}'::jsonb, 1, now(), now()),
        (gen_random_uuid(), 'ui.toast_duration_ms', '{"value": 4000}'::jsonb, 'int', 'global', '토스트 알림 표시 시간(ms)', false, '{"value": 4000}'::jsonb, 1, now(), now())
    ON CONFLICT (key, scope) DO NOTHING;
    """
    result = _run_app_psql(seed_sql)
    if result.returncode == 0:
        print("  ✓ 채널 타입 시드 완료 (cafe24, naver, coupang)")
        print("  ✓ 기본 앱 설정 시드 완료")
    else:
        print(f"  [오류] 시드 실패:\n{result.stderr}")
        return False
    return True


def step_reset_database():
    print("\n[초기화] 데이터베이스 삭제 후 재생성")
    run_psql(f"DROP DATABASE IF EXISTS {APP_DB};")
    run_psql(f"DROP ROLE IF EXISTS {APP_USER};")
    print("  ✓ DB 및 유저 삭제 완료")


def verify_setup():
    print("\n" + "=" * 50)
    print("셋업 검증")
    print("=" * 50)

    result = _run_app_psql(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"
    )
    if result.returncode == 0:
        print("  ✓ DB 접속 성공")
        tables = [
            line.strip()
            for line in result.stdout.strip().split("\n")
            if line.strip()
            and line.strip() != "tablename"
            and "---" not in line
            and "rows)" not in line
        ]
        print(f"  ✓ 테이블 {len(tables)}개 확인: {', '.join(tables)}")
    else:
        print("  ✗ DB 접속 실패")

    channel_count = _run_app_psql("SELECT count(*) FROM channel_types;")
    # -t -A 플래그 없이 실행했으므로 stdout에서 숫자만 추출
    if channel_count.returncode == 0:
        count = channel_count.stdout.strip().split("\n")
        # 두 번째 줄이 값 (헤더 제외)
        val = next((l.strip() for l in count if l.strip().isdigit()), "?")
        print(f"  ✓ 채널 타입 {val}개 등록됨")

    settings_count = _run_app_psql("SELECT count(*) FROM app_settings;")
    if settings_count.returncode == 0:
        count = settings_count.stdout.strip().split("\n")
        val = next((l.strip() for l in count if l.strip().isdigit()), "?")
        print(f"  ✓ 앱 설정 {val}개 등록됨")

    print(
        "\n셋업 완료! 서버 시작: cd apps/api && python -m uvicorn src.main:app --reload --port 8000"
    )


def main():
    parser = argparse.ArgumentParser(description="OmniCommerce 셋업 스크립트")
    parser.add_argument("--db-only", action="store_true", help="DB/유저 생성만")
    parser.add_argument("--migrate", action="store_true", help="마이그레이션만 실행")
    parser.add_argument("--seed", action="store_true", help="시드 데이터만 ���입")
    parser.add_argument("--reset", action="store_true", help="DB 초기화 후 전체 재생성")
    args = parser.parse_args()

    print("=" * 50)
    print("  OmniCommerce 셋업")
    print("=" * 50)

    if args.reset:
        step_reset_database()

    if args.db_only:
        step_create_user()
        step_create_database()
    elif args.migrate:
        step_run_migrations()
    elif args.seed:
        step_seed_data()
    else:
        step_create_user()
        step_create_database()
        step_create_env()
        step_run_migrations()
        step_seed_data()

    verify_setup()


if __name__ == "__main__":
    main()
