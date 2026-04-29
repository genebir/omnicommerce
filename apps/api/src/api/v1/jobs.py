"""비동기 작업 API (§7) — 202 Accepted + job_id."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.api.v1.schemas import ApiResponse
from src.core.deps import CurrentUserDep
from src.infra.queue.enqueue import enqueue_task

router = APIRouter(prefix="/jobs", tags=["작업"])


class EnqueueRequest(BaseModel):
    task: str
    params: dict = {}


class JobResponse(BaseModel):
    job_id: str
    status: str


@router.post("", status_code=202)
async def create_job(body: EnqueueRequest, current_user: CurrentUserDep) -> ApiResponse[JobResponse]:
    """비동기 작업을 큐에 추가하고 job_id를 반환. 인증된 사용자만 호출 가능."""
    _ = current_user  # 인증 강제용 의존성 — 큐 워커는 params 기반으로 권한 처리

    allowed_tasks = {
        "sync_channel_products",
        "sync_channel_orders",
        "update_channel_inventory",
        "bulk_upload_products",
    }
    if body.task not in allowed_tasks:
        raise HTTPException(status_code=400, detail=f"허용되지 않는 작업: {body.task}")

    job = await enqueue_task(body.task, **body.params)
    return ApiResponse(data=JobResponse(job_id=job.job_id, status="queued"))


@router.get("/{job_id}")
async def get_job_status(job_id: str, current_user: CurrentUserDep) -> ApiResponse[JobResponse]:
    """작업 상태 조회. 인증된 사용자만 호출 가능."""
    _ = current_user

    from arq import create_pool
    from arq.jobs import Job

    from src.infra.queue.settings import get_redis_settings

    pool = await create_pool(get_redis_settings())
    job = Job(job_id, pool)
    info = await job.info()
    await pool.aclose()

    if info is None:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다")

    status = info.status if hasattr(info, "status") else "unknown"
    return ApiResponse(data=JobResponse(job_id=job_id, status=str(status)))
