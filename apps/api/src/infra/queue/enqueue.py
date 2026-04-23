"""작업 큐 enqueue 헬퍼."""

from arq import create_pool
from arq.jobs import Job

from src.infra.queue.settings import get_redis_settings


async def enqueue_task(function_name: str, **kwargs) -> Job:
    """태스크를 ARQ 큐에 추가."""
    pool = await create_pool(get_redis_settings())
    job = await pool.enqueue_job(function_name, **kwargs)
    await pool.aclose()
    return job
