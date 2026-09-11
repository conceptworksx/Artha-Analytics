from bson import ObjectId
from typing import Optional
from core.database import get_db
from core.exceptions import DatabaseOperationError
from core.logging import get_logger
from services.cache_service import CacheService

logger = get_logger(__name__)


class AnalysisRepository:
    MAX_ANALYSES_PER_USER = 5

    def __init__(self, cache_service: Optional[CacheService] = None):
        self.cache = cache_service or CacheService()

    @property
    def analyses_collection(self):
        return get_db()["analyses"]

    @property
    def ip_searches_collection(self):
        return get_db()["ip_searches"]

    async def save_analysis(self, user_id: str, ticker: str, doc: dict) -> str:
        try:
            doc["user_id"] = user_id
            doc["ticker"] = ticker

            existing = await self.analyses_collection.find_one(
                {"user_id": user_id, "ticker": ticker}, {"_id": 1}
            )
            if existing:
                doc["_id"] = existing["_id"]
            elif "_id" not in doc:
                doc["_id"] = ObjectId()

            await self.analyses_collection.replace_one(
                {"user_id": user_id, "ticker": ticker}, doc, upsert=True
            )
            analysis_id = str(doc["_id"])

            cursor = self.analyses_collection.find(
                {"user_id": user_id}, {"_id": 1}, sort=[("analyzed_at", -1)]
            )
            all_ids = await cursor.to_list(length=None)

            if len(all_ids) > self.MAX_ANALYSES_PER_USER:
                ids_to_delete = [
                    d["_id"] for d in all_ids[self.MAX_ANALYSES_PER_USER :]
                ]
                await self.analyses_collection.delete_many(
                    {"_id": {"$in": ids_to_delete}}
                )
                logger.info(
                    f"Pruned {len(ids_to_delete)} old analyses for user={user_id}"
                )

            # Invalidate user past analysis metadata cache in Redis
            if self.cache.is_enabled:
                cache_key = f"user:analyses:{user_id}"
                await self.cache.delete(cache_key)
                logger.info(
                    f"[AnalysisRepository] Invalidated user analyses cache | user={user_id}"
                )

            return analysis_id
        except Exception as e:
            raise DatabaseOperationError(f"Failed to save analysis: {e}")

    async def get_user_analyses(self, user_id: str, limit: int = 5) -> list[dict]:
        try:
            cache_key = f"user:analyses:{user_id}"

            # 1. Try fetching metadata list from Upstash Redis Cache first
            if self.cache.is_enabled:
                cached_list = await self.cache.get_json(cache_key)
                if cached_list:
                    logger.info(
                        f"[AnalysisRepository] Past analyses cache HIT | user={user_id}"
                    )
                    return cached_list

            # 2. On Cache MISS: Query MongoDB for metadata only
            effective_limit = min(limit, self.MAX_ANALYSES_PER_USER)
            cursor = self.analyses_collection.find(
                {"user_id": user_id},
                {
                    "news_analyst_report": 0,
                    "news_analyst_summary": 0,
                    "technical_analyst_report": 0,
                    "technical_analyst_summary": 0,
                    "fundamental_analyst_report": 0,
                    "fundamental_analyst_summary": 0,
                    "market_analyst_report": 0,
                    "market_analyst_summary": 0,
                    "sector_analyst_report": 0,
                    "sector_analyst_summary": 0,
                    "historical_prices": 0,
                    "charts_data": 0,
                    "fundamental_data": 0,
                    "technical_data": 0,
                    "market_data": 0,
                    "company_news": 0,
                    "indian_news": 0,
                    "global_news": 0,
                    "verdict": 0,
                    "bull_thesis": 0,
                    "bear_thesis": 0,
                    "debate_transcript": 0,
                },
                sort=[("analyzed_at", -1)],
                limit=effective_limit,
            )
            raw_list = await cursor.to_list(length=effective_limit)

            formatted_list = []
            for doc in raw_list:
                doc_copy = dict(doc)
                if "_id" in doc_copy:
                    id_str = str(doc_copy["_id"])
                    doc_copy["id"] = id_str
                    doc_copy["_id"] = id_str
                formatted_list.append(doc_copy)

            # 3. Store formatted metadata list in Upstash Redis (1 hour TTL)
            if self.cache.is_enabled:
                await self.cache.set_json(cache_key, formatted_list, ttl_seconds=3600)
                logger.info(
                    f"[AnalysisRepository] Cached user analyses metadata in Redis | user={user_id}"
                )

            return formatted_list
        except Exception as e:
            raise DatabaseOperationError(f"Failed to fetch user analyses: {e}")

    async def get_analysis_by_id(self, analysis_id: str, user_id: str) -> dict | None:
        try:
            # Full analysis details fetched directly from MongoDB on click
            return await self.analyses_collection.find_one(
                {
                    "_id": ObjectId(analysis_id),
                    "user_id": user_id,
                }
            )
        except Exception as e:
            raise DatabaseOperationError(f"Failed to fetch analysis by id: {e}")

    async def increment_ip_search(self, client_ip: str):
        try:
            await self.ip_searches_collection.update_one(
                {"ip": client_ip}, {"$inc": {"count": 1}}, upsert=True
            )
        except Exception as e:
            raise DatabaseOperationError(f"Failed to increment IP search count: {e}")

    async def get_ip_search_count(self, client_ip: str) -> int:
        try:
            ip_record = await self.ip_searches_collection.find_one({"ip": client_ip})
            return ip_record.get("count", 0) if ip_record else 0
        except Exception as e:
            raise DatabaseOperationError(f"Failed to get IP search count: {e}")
