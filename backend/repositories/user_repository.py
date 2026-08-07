from bson import ObjectId
from core.database import get_db
from core.exceptions import DatabaseOperationError


class UserRepository:
    def __init__(self):
        pass

    @property
    def collection(self):
        db = get_db()
        return db["users"]

    async def get_by_email(self, email: str) -> dict | None:
        try:
            return await self.collection.find_one({"email": email.lower()})
        except Exception as e:
            raise DatabaseOperationError(f"Failed to fetch user by email: {e}")

    async def get_by_id(self, user_id: str) -> dict | None:
        try:
            return await self.collection.find_one({"_id": ObjectId(user_id)})
        except Exception as e:
            raise DatabaseOperationError(f"Failed to fetch user by id: {e}")

    async def create_user(self, user_data: dict) -> str:
        try:
            result = await self.collection.insert_one(user_data)
            return str(result.inserted_id)
        except Exception as e:
            raise DatabaseOperationError(f"Failed to create user: {e}")

    async def update_user(self, user_id: str, update_data: dict):
        try:
            await self.collection.update_one(
                {"_id": ObjectId(user_id)}, {"$set": update_data}
            )
        except Exception as e:
            raise DatabaseOperationError(f"Failed to update user: {e}")
