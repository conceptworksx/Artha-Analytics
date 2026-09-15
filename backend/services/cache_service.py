import os
import json
from typing import Any, Optional
from upstash_redis.asyncio import Redis
from core.logging import get_logger

logger = get_logger(__name__)


class CacheService:
    """
    Production-grade cache abstraction wrapping official upstash-redis asyncio SDK.
    Encapsulates all Upstash Redis SDK operations behind a clean, resilient interface.
    Operates in Bypass / Local Dev Mode when Upstash credentials are missing or placeholder.
    Catches all network/SDK exceptions silently so Redis issues never fail user requests.
    """

    def __init__(
        self,
        url: Optional[str] = None,
        token: Optional[str] = None,
    ):
        self.url = (url or os.getenv("UPSTASH_REDIS_REST_URL", "")).rstrip("/")
        self.token = token or os.getenv("UPSTASH_REDIS_REST_TOKEN", "")

        self.is_enabled = bool(
            self.url
            and self.token
            and not self.url.startswith("https://your-upstash")
            and "your_upstash" not in self.token
        )

        self._client: Optional[Redis] = None
        if self.is_enabled:
            try:
                self._client = Redis(url=self.url, token=self.token)
            except Exception as e:
                logger.warning(
                    f"[CacheService] Failed to initialize upstash-redis client: {e}"
                )
                self.is_enabled = False
        else:
            logger.info(
                "[CacheService] Operating in Bypass / Local Dev Mode (No Upstash Redis configured)"
            )

    async def get_json(self, key: str) -> Optional[Any]:
        if not self.is_enabled or not self._client:
            return None
        try:
            logger.info(f"[CacheService] [READ] Fetching key={key}")
            val = await self._client.get(key)
            if not val:
                logger.info(f"[CacheService] [READ] [MISS] key={key}")
                return None
            logger.info(f"[CacheService] [READ] [HIT] key={key}")
            return json.loads(val) if isinstance(val, str) else val
        except Exception as e:
            logger.warning(f"[CacheService] [READ] get_json failed for key={key}: {e}")
            return None

    async def set_json(self, key: str, value: Any, ttl_seconds: int = 1200) -> bool:
        if not self.is_enabled or not self._client:
            return False
        try:
            logger.info(
                f"[CacheService] [WRITE] Storing key={key} | ttl={ttl_seconds}s"
            )
            serialized = json.dumps(value)
            serialized = json.dumps(value, default=str)
            res = await self._client.set(key, serialized, ex=ttl_seconds)
            logger.info(f"[CacheService] [WRITE] [STORED] key={key}")
            return bool(res)
        except Exception as e:
            logger.warning(f"[CacheService] [WRITE] set_json failed for key={key}: {e}")
            return False

    async def delete(self, key: str) -> bool:
        if not self.is_enabled or not self._client:
            return False
        try:
            logger.info(f"[CacheService] [WRITE] Deleting key={key}")
            res = await self._client.delete(key)
            logger.info(f"[CacheService] [WRITE] [DELETED] key={key}")
            return bool(res and res > 0)
        except Exception as e:
            logger.warning(f"[CacheService] [WRITE] delete failed for key={key}: {e}")
            return False

    async def acquire_lock(self, lock_key: str, ttl_seconds: int = 600) -> bool:
        if not self.is_enabled or not self._client:
            return True
        try:
            logger.info(
                f"[CacheService] [WRITE] Attempting acquire_lock key={lock_key} | ttl={ttl_seconds}s"
            )
            res = await self._client.set(lock_key, "1", nx=True, ex=ttl_seconds)
            acquired = bool(res)
            if acquired:
                logger.info(f"[CacheService] [WRITE] [LOCK ACQUIRED] key={lock_key}")
            else:
                logger.info(
                    f"[CacheService] [WRITE] [LOCK HELD BY OTHER PROCESS] key={lock_key}"
                )
            return acquired
        except Exception as e:
            logger.warning(
                f"[CacheService] [WRITE] acquire_lock failed for key={lock_key}: {e}"
            )
            return True

    async def release_lock(self, lock_key: str) -> bool:
        logger.info(f"[CacheService] [WRITE] Releasing lock_key={lock_key}")
        return await self.delete(lock_key)

    async def incr_counter(self, key: str, ttl_seconds: int = 3600) -> int:
        if not self.is_enabled or not self._client:
            return 1
        try:
            logger.info(
                f"[CacheService] [WRITE] Incrementing counter key={key} | ttl={ttl_seconds}s"
            )
            pipeline = self._client.pipeline()
            pipeline.incr(key)
            pipeline.expire(key, ttl_seconds)
            results = await pipeline.exec()
            if results and len(results) > 0 and isinstance(results[0], int):
                count = results[0]
                logger.info(
                    f"[CacheService] [WRITE] [COUNTER INCR] key={key} | count={count}"
                )
                return count
            return 1
        except Exception as e:
            logger.warning(
                f"[CacheService] [WRITE] incr_counter failed for key={key}: {e}"
            )
            return 1
