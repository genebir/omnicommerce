.PHONY: setup dev worker test lint migrate db-reset seed doctor clean

# ── 초기 세팅 ──
setup:
	python setup.py

# ── 개발 서버 ──
dev:
	cd apps/api && uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# ── ARQ 워커 ──
worker:
	cd apps/api && uv run python -m arq src.infra.queue.worker.WorkerSettings

# ── DB ──
migrate:
	cd apps/api && uv run alembic upgrade head

migrate-gen:
	cd apps/api && uv run alembic revision --autogenerate -m "$(msg)"

db-reset:
	python setup.py --reset
	python setup.py

seed:
	python setup.py --seed

# ── 테스트 ──
test:
	cd apps/api && uv run pytest tests/ -v

test-cov:
	cd apps/api && uv run pytest tests/ --cov=src --cov-report=term-missing

# ── 린팅 ──
lint:
	cd apps/api && uv run ruff check src/ --fix && uv run ruff format src/

lint-check:
	cd apps/api && uv run ruff check src/ && uv run ruff format --check src/

typecheck:
	cd apps/api && uv run mypy src/

# ── 헬스체크 ──
doctor:
	@echo "=== OmniCommerce Doctor ==="
	@echo "Python 버전 확인..."
	@python --version
	@echo "uv 버전 확인..."
	@uv --version
	@echo "uv.lock 확인..."
	@test -f apps/api/uv.lock && echo "  ✓ uv.lock 존재" || echo "  ✗ uv.lock 없음"
	@echo "PostgreSQL 연결 확인..."
	@PGPASSWORD='omni_secure_2026!' psql -h localhost -p 5432 -U omni_user -d omni_commerce -c "SELECT 1;" > /dev/null 2>&1 && echo "  ✓ DB 연결 정상" || echo "  ✗ DB 연결 실패"
	@echo "Alembic 마이그레이션 확인..."
	@cd apps/api && uv run alembic current 2>&1 | grep -q "head" && echo "  ✓ 마이그레이션 최신" || echo "  ⚠ 마이그레이션 미적용"
	@echo "채널 타입 확인..."
	@PGPASSWORD='omni_secure_2026!' psql -h localhost -p 5432 -U omni_user -d omni_commerce -t -A -c "SELECT count(*) FROM channel_types;" 2>/dev/null | xargs -I{} echo "  ✓ 채널 타입 {}개"
	@echo "앱 설정 확인..."
	@PGPASSWORD='omni_secure_2026!' psql -h localhost -p 5432 -U omni_user -d omni_commerce -t -A -c "SELECT count(*) FROM app_settings;" 2>/dev/null | xargs -I{} echo "  ✓ 앱 설정 {}개"
	@echo "=== Doctor 완료 ==="

# ── 정리 ──
clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .mypy_cache -exec rm -rf {} + 2>/dev/null || true
