from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.server_api import ServerApi
import ssl
import certifi
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME     = os.getenv("DB_NAME", "datawise")

client = None
db     = None


async def connect_db():
    global client, db
    try:
        is_atlas = "mongodb+srv" in MONGODB_URL or "mongodb.net" in MONGODB_URL

        if is_atlas:
            # Try 1: Standard Atlas connection with certifi CA bundle
            try:
                client = AsyncIOMotorClient(
                    MONGODB_URL,
                    server_api=ServerApi('1'),
                    tlsCAFile=certifi.where(),   # fixes SSL on Windows
                    serverSelectionTimeoutMS=15000,
                )
                db = client[DB_NAME]
                await client.admin.command("ping")
                print(f"✅ Connected to MongoDB Atlas: {DB_NAME}")
                return
            except Exception as e1:
                print(f"⚠️  Attempt 1 failed: {e1}")

            # Try 2: Allow any TLS version
            try:
                client = AsyncIOMotorClient(
                    MONGODB_URL,
                    server_api=ServerApi('1'),
                    tls=True,
                    tlsAllowInvalidCertificates=True,   # last resort
                    serverSelectionTimeoutMS=15000,
                )
                db = client[DB_NAME]
                await client.admin.command("ping")
                print(f"✅ Connected to MongoDB Atlas (relaxed TLS): {DB_NAME}")
                return
            except Exception as e2:
                print(f"⚠️  Attempt 2 failed: {e2}")
                raise e2

        else:
            # Local MongoDB
            client = AsyncIOMotorClient(
                MONGODB_URL,
                serverSelectionTimeoutMS=5000,
            )
            db = client[DB_NAME]
            await client.admin.command("ping")
            print(f"✅ Connected to MongoDB local: {DB_NAME}")

    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        print("⚠️  App will run without DB (uploads still work in memory)")
        db = None


async def close_db():
    global client
    if client:
        client.close()
        print("🔌 MongoDB connection closed")


def get_db():
    return db
