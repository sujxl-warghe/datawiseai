import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fastapi import APIRouter, HTTPException, Query
from utils.database import get_db

router = APIRouter()


@router.get("/queries/{file_id}")
async def get_query_history(
    file_id: str,
    limit: int = Query(50, ge=1, le=200),
):
    """Get query history for a file."""
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    cursor = db.queries.find({"file_id": file_id}).sort("created_at", -1).limit(limit)
    history = []
    async for doc in cursor:
        doc.pop("_id", None)
        history.append(doc)
    return history


@router.get("/sessions/{file_id}")
async def get_sessions(
    file_id: str,
    limit: int = Query(20, ge=1, le=100),
):
    """Get all chat sessions for a file."""
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    cursor = db.sessions.find({"file_id": file_id}).sort("updated_at", -1).limit(limit)
    sessions = []
    async for doc in cursor:
        doc.pop("_id", None)
        sessions.append(doc)
    return sessions


@router.delete("/queries/{file_id}")
async def clear_query_history(file_id: str):
    """Clear query history for a file."""
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    result = await db.queries.delete_many({"file_id": file_id})
    return {"deleted": result.deleted_count}
