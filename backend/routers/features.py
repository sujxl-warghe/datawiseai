import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from io import StringIO

from utils.database import get_db
from utils.data_processor import (
    load_file_to_df, load_dataframe_from_csv_string,
    dataframe_to_csv_string, dataframe_to_json_records
)
from services.feature_service import (
    apply_transformation, get_suggested_transforms,
    get_column_types, get_column_stats, TRANSFORMATIONS
)

# ── Setup logging ───────────────────────────────────────────────────

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

router = APIRouter()

# ── Pydantic Models ──────────────────────────────────────────────────


class TransformRequest(BaseModel):
    file_id: str
    col: str
    transform: str
    col2: Optional[str] = None
    new_col_name: Optional[str] = None


class ApplyAllRequest(BaseModel):
    file_id: str
    steps: List[TransformRequest]


# ── Helper Functions ────────────────────────────────────────────────

async def get_working_dataframe(file_id: str, db):
    """Load working dataframe from MongoDB session or original file.
    
    Returns (df, error_msg) tuple.
    On success: (DataFrame, None)
    On error: (None, error_message)
    """
    if not file_id or not file_id.strip():
        return None, "missing_file_id"

    try:
        # Try loading from engineered session first (most recent work)
        session = await db.fe_sessions.find_one({"file_id": file_id})
        if session and session.get("csv_data"):
            logger.info(f"↻ Loading engineered data from MongoDB session (file_id: {file_id})")
            df = load_dataframe_from_csv_string(session["csv_data"])
            if df is not None:
                return df, None
            logger.warning(f"⚠️  Failed to parse CSV from session, falling back to original file")

        # Fall back to original file
        logger.info(f"→ Loading original file (file_id: {file_id})")
        file_doc = await db.files.find_one({"file_id": file_id})
        if not file_doc:
            logger.error(f"✗ File not found: {file_id}")
            return None, "file_not_found"

        file_path = file_doc.get("file_path")
        filename = file_doc.get("filename")

        if not file_path or not filename:
            logger.error(f"✗ Invalid file metadata for {file_id}")
            return None, "invalid_file_metadata"

        df = load_file_to_df(file_path, filename)
        if df is None:
            logger.error(f"✗ Could not load file at {file_path}")
            return None, "file_load_error"

        return df, None

    except Exception as e:
        logger.error(f"✗ Exception in get_working_dataframe: {str(e)}")
        return None, "database_error"


# ── GET /transforms ─────────────────────────────────────────────────

@router.get("/transforms")
async def get_transforms():
    """Return all available transformation types."""
    logger.info("→ GET /transforms")
    return TRANSFORMATIONS


# ── GET /info/{file_id} ─────────────────────────────────────────────

@router.get("/info/{file_id}")
async def get_info(file_id: str):
    """Get column info, data types, and transformation suggestions."""
    logger.info(f"→ GET /info/{file_id}")

    db = get_db()
    if db is None:
        logger.error("✗ Database unavailable")
        raise HTTPException(503, "Database unavailable")

    df, error = await get_working_dataframe(file_id, db)
    if error:
        if error == "missing_file_id":
            raise HTTPException(400, "file_id is required")
        elif error == "file_not_found":
            raise HTTPException(404, "File not found")
        elif error == "invalid_file_metadata":
            raise HTTPException(500, "Invalid file metadata in database")
        elif error == "file_load_error":
            raise HTTPException(500, "Could not read file from storage")
        else:
            raise HTTPException(503, "Database error")

    try:
        col_types = get_column_types(df)
        col_stats = [get_column_stats(df, col) for col in df.columns]
        suggestions = get_suggested_transforms(df)

        logger.info(f"✓ Info gathered for {file_id}: {len(df.columns)} cols, {len(df)} rows")

        return {
            "file_id": file_id,
            "row_count": len(df),
            "col_count": len(df.columns),
            "columns": df.columns.tolist(),
            "col_types": col_types,
            "col_stats": col_stats,
            "suggestions": suggestions,
        }
    except Exception as e:
        logger.error(f"✗ Error in get_info: {str(e)}")
        raise HTTPException(500, "Internal server error")


# ── POST /preview ───────────────────────────────────────────────────

@router.post("/preview")
async def preview_transform(request: TransformRequest):
    """Preview the result of applying a single transformation."""
    logger.info(f"→ POST /preview: {request.transform} on {request.col}")

    db = get_db()
    if db is None:
        logger.error("✗ Database unavailable")
        raise HTTPException(503, "Database unavailable")

    # Validate request
    if not request.file_id or not request.col or not request.transform:
        logger.warning(f"⚠️  Missing required fields in preview request")
        raise HTTPException(400, "file_id, col, and transform are required")

    df, error = await get_working_dataframe(request.file_id, db)
    if error:
        if error == "file_not_found":
            raise HTTPException(404, "File not found")
        else:
            raise HTTPException(503, "Database error")

    try:
        # Validate column exists
        if request.col not in df.columns:
            logger.warning(f"⚠️  Column '{request.col}' not found in {df.columns.tolist()}")
            raise HTTPException(400, f"Column '{request.col}' not found")

        # Validate transformation name
        if request.transform not in TRANSFORMATIONS:
            logger.warning(f"⚠️  Unknown transformation: {request.transform}")
            raise HTTPException(400, f"Unknown transformation: {request.transform}")

        # Get stats before
        before_stats = get_column_stats(df, request.col)

        # Apply transformation
        df_new, new_col, msg = apply_transformation(
            df, request.col, request.transform,
            request.col2, request.new_col_name
        )

        # Check for errors
        if "Error" in msg or not new_col:
            logger.warning(f"⚠️  Transformation failed: {msg}")
            raise HTTPException(400, msg or "Transformation failed")

        # Get stats after
        after_col = new_col if new_col and new_col in df_new.columns else request.col
        after_stats = get_column_stats(df_new, after_col) if after_col in df_new.columns else {}

        # Get sample data
        sample_before = df[request.col].head(8).tolist()
        sample_after = df_new[after_col].head(8).tolist() if after_col in df_new.columns else []

        logger.info(f"✓ Preview generated: {request.transform} → {new_col}")

        return {
            "message": msg,
            "new_col": new_col,
            "before_stats": before_stats,
            "after_stats": after_stats,
            "sample_before": [str(v) if v is not None else None for v in sample_before],
            "sample_after": [
                str(round(v, 4)) if isinstance(v, float) else str(v) if v is not None else None
                for v in sample_after
            ],
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"✗ Exception in preview_transform: {str(e)}")
        raise HTTPException(500, "Internal server error")


# ── POST /apply ──────────────────────────────────────────────────────

@router.post("/apply")
async def apply_transform(request: TransformRequest):
    """Apply transformation and persist to MongoDB session."""
    logger.info(f"→ POST /apply: {request.transform} on {request.col}")

    db = get_db()
    if db is None:
        logger.error("✗ Database unavailable")
        raise HTTPException(503, "Database unavailable")

    if not request.file_id or not request.col or not request.transform:
        raise HTTPException(400, "file_id, col, and transform are required")

    df, error = await get_working_dataframe(request.file_id, db)
    if error:
        if error == "file_not_found":
            raise HTTPException(404, "File not found")
        else:
            raise HTTPException(503, "Database error")

    try:
        # Validate column
        if request.col not in df.columns:
            logger.warning(f"⚠️  Column '{request.col}' not found")
            raise HTTPException(400, f"Column '{request.col}' not found")

        # Validate transformation
        if request.transform not in TRANSFORMATIONS:
            logger.warning(f"⚠️  Unknown transformation: {request.transform}")
            raise HTTPException(400, f"Unknown transformation: {request.transform}")

        # Apply transformation
        df_new, new_col, msg = apply_transformation(
            df, request.col, request.transform,
            request.col2, request.new_col_name
        )

        if "Error" in msg or not new_col:
            logger.warning(f"⚠️  Transformation failed: {msg}")
            raise HTTPException(400, msg or "Transformation failed")

        # Store engineered data in MongoDB
        try:
            csv_data = dataframe_to_csv_string(df_new)
            if not csv_data:
                raise ValueError("Failed to convert dataframe to CSV")

            json_data = dataframe_to_json_records(df_new)

            # Create step record
            step = {
                "col": request.col,
                "transform": request.transform,
                "col2": request.col2,
                "new_col": new_col,
                "msg": msg,
                "applied_at": datetime.utcnow().isoformat(),
            }

            # Upsert session with CSV data persistence
            result = await db.fe_sessions.update_one(
                {"file_id": request.file_id},
                {
                    "$set": {
                        "csv_data": csv_data,  # Store CSV string
                        "json_data": json_data,  # Backup JSON format
                        "updated_at": datetime.utcnow(),
                        "columns": df_new.columns.tolist(),
                        "row_count": len(df_new),
                    },
                    "$push": {"steps": step}
                },
                upsert=True
            )

            logger.info(f"✓ Transformation applied: {request.transform} → {new_col}")
            logger.info(f"✓ Session persisted to MongoDB for {request.file_id}")

            # Fetch updated session for response
            session = await db.fe_sessions.find_one({"file_id": request.file_id})
            steps_done = session.get("steps", []) if session else [step]

            return {
                "message": msg,
                "new_col": new_col,
                "row_count": len(df_new),
                "col_count": len(df_new.columns),
                "columns": df_new.columns.tolist(),
                "steps_done": steps_done,
            }

        except Exception as e:
            logger.error(f"✗ Failed to persist session: {str(e)}")
            raise HTTPException(500, "Failed to save transformation to database")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"✗ Exception in apply_transform: {str(e)}")
        raise HTTPException(500, "Internal server error")


# ── GET /session/{file_id} ──────────────────────────────────────────

@router.get("/session/{file_id}")
async def get_session(file_id: str):
    """Get current feature engineering session state."""
    logger.info(f"→ GET /session/{file_id}")

    if not file_id or not file_id.strip():
        raise HTTPException(400, "file_id is required")

    db = get_db()
    if db is None:
        logger.error("✗ Database unavailable")
        raise HTTPException(503, "Database unavailable")

    try:
        session = await db.fe_sessions.find_one({"file_id": file_id})

        if not session:
            logger.info(f"  No session found for {file_id}, returning empty state")
            return {
                "file_id": file_id,
                "steps": [],
                "columns": [],
                "row_count": 0,
                "col_count": 0,
            }

        session.pop("_id", None)
        session.pop("csv_data", None)  # Don't send large CSV in response
        session.pop("json_data", None)  # Don't send large JSON in response

        logger.info(f"✓ Session fetched: {len(session.get('steps', []))} steps")

        return session

    except Exception as e:
        logger.error(f"✗ Exception in get_session: {str(e)}")
        raise HTTPException(500, "Internal server error")


# ── GET /preview/{file_id} ──────────────────────────────────────────

@router.get("/preview/{file_id}")
async def preview_data(file_id: str, rows: int = 50):
    """Get preview of current engineered data (or original if no session)."""
    logger.info(f"→ GET /preview/{file_id} (rows: {rows})")

    if not file_id or not file_id.strip():
        raise HTTPException(400, "file_id is required")

    if rows < 1 or rows > 500:
        raise HTTPException(400, "rows must be between 1 and 500")

    db = get_db()
    if db is None:
        logger.error("✗ Database unavailable")
        raise HTTPException(503, "Database unavailable")

    try:
        df, error = await get_working_dataframe(file_id, db)
        if error:
            if error == "file_not_found":
                raise HTTPException(404, "File not found")
            else:
                raise HTTPException(503, "Database error")

        # Convert datetime columns to strings for JSON serialization
        for col in df.columns:
            if str(df[col].dtype).startswith("datetime"):
                df[col] = df[col].astype(str)

        preview_rows = df.head(rows).fillna("").to_dict(orient="records")

        logger.info(f"✓ Preview generated: {len(preview_rows)} rows")

        return {
            "columns": df.columns.tolist(),
            "rows": preview_rows,
            "row_count": len(df),
            "col_count": len(df.columns),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"✗ Exception in preview_data: {str(e)}")
        raise HTTPException(500, "Internal server error")


# ── GET /download/{file_id} ────────────────────────────────────────

@router.get("/download/{file_id}")
async def download_engineered(file_id: str):
    """Download engineered dataset as CSV (from MongoDB, not filesystem)."""
    logger.info(f"→ GET /download/{file_id}")

    if not file_id or not file_id.strip():
        raise HTTPException(400, "file_id is required")

    db = get_db()
    if db is None:
        logger.error("✗ Database unavailable")
        raise HTTPException(503, "Database unavailable")

    try:
        # Get session from MongoDB
        session = await db.fe_sessions.find_one({"file_id": file_id})

        if not session or not session.get("csv_data"):
            logger.warning(f"⚠️  No engineered dataset found for {file_id}")
            raise HTTPException(
                404,
                "No engineered dataset found. Apply transformations first."
            )

        # Try to get original filename for download
        file_doc = await db.files.find_one({"file_id": file_id})
        orig_name = "engineered_data"
        if file_doc and file_doc.get("filename"):
            orig_name = file_doc["filename"].rsplit(".", 1)[0]

        csv_string = session.get("csv_data", "")
        if not csv_string:
            logger.error(f"✗ CSV data is empty for {file_id}")
            raise HTTPException(500, "CSV data is corrupted")

        # Create streaming CSV response
        logger.info(f"✓ Streaming download for {file_id}")

        return StreamingResponse(
            iter([csv_string]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={orig_name}_engineered.csv"}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"✗ Exception in download_engineered: {str(e)}")
        raise HTTPException(500, "Internal server error")


# ── DELETE /session/{file_id} ──────────────────────────────────────

@router.delete("/session/{file_id}")
async def reset_session(file_id: str):
    """Delete feature engineering session (reset to original file)."""
    logger.info(f"→ DELETE /session/{file_id}")

    if not file_id or not file_id.strip():
        raise HTTPException(400, "file_id is required")

    db = get_db()
    if db is None:
        logger.error("✗ Database unavailable")
        raise HTTPException(503, "Database unavailable")

    try:
        result = await db.fe_sessions.delete_one({"file_id": file_id})

        if result.deleted_count == 0:
            logger.info(f"  No session found to delete for {file_id}")
            return {"message": "No session found, but reset successful"}

        logger.info(f"✓ Session reset for {file_id}")

        return {"message": "Feature engineering session reset successfully"}

    except Exception as e:
        logger.error(f"✗ Exception in reset_session: {str(e)}")
        raise HTTPException(500, "Internal server error")
