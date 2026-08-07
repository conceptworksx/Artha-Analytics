import os
from motor.motor_asyncio import AsyncIOMotorClient
from core.logging import get_logger

logger = get_logger(__name__)


class Database:
    client: AsyncIOMotorClient = None
    db = None


db_instance = Database()


async def connect_to_mongo():
    uri = os.getenv("MONGODB_URI")
    db_instance.client = AsyncIOMotorClient(uri)
    try:
        db_instance.db = db_instance.client.get_default_database()
        if db_instance.db is None:
            db_instance.db = db_instance.client["artha_analytics"]
    except Exception:
        db_instance.db = db_instance.client["artha_analytics"]

    try:
        # Create indexes asynchronously
        await db_instance.db["users"].create_index("email", unique=True)
        await db_instance.db["ip_searches"].create_index("ip", unique=True)
        await db_instance.db["analyses"].create_index(
            [("user_id", 1), ("analyzed_at", -1)]
        )
        await db_instance.client.admin.command("ping")
        logger.info("Connected to MongoDB successfully and created indexes.")
    except Exception as e:
        logger.error(f"Failed to initialize MongoDB connection: {e}")


async def close_mongo_connection():
    if db_instance.client:
        db_instance.client.close()
        logger.info("Closed MongoDB connection.")


def get_db():
    return db_instance.db
