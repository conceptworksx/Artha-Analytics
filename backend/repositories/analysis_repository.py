from bson import ObjectId
from core.database import get_db
from core.exceptions import DatabaseOperationError
from core.logging import get_logger

logger = get_logger(__name__)


class AnalysisRepository:
    MAX_ANALYSES_PER_USER = 5

    def __init__(self):
        pass

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
            if "_id" not in doc:
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

            return analysis_id
        except Exception as e:
            raise DatabaseOperationError(f"Failed to save analysis: {e}")

    async def get_user_analyses(self, user_id: str, limit: int = 10) -> list[dict]:
        try:
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
                limit=limit,
            )
            return await cursor.to_list(length=limit)
        except Exception as e:
            raise DatabaseOperationError(f"Failed to fetch user analyses: {e}")

    async def get_analysis_by_id(self, analysis_id: str, user_id: str) -> dict | None:
        try:
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
