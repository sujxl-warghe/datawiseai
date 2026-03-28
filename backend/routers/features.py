from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
import os, uuid, csv, tempfile
from datetime import datetime

from utils.database import get_db
from utils.data_processor import load_file_to_df, save_df_to_temp_csv
from services.feature_service import (
    apply_transformation, get_suggested_transforms,
    get_column_types, get_column_stats, TRANSFORMATIONS
)

router = APIRouter()


class TransformRequest(BaseModel):
    file_id:      str
    col:          str
    transform:    str
    col2:         Optional[str] = None
    new_col_name: Optional[str] = None


class ApplyAllRequest(BaseModel):
    file_id:  str
    steps:    List[TransformRequest]


# ── Get available transformations ─────────────────────────────────

@router.get("/transforms")
async def get_transforms():
    return TRANSFORMATIONS


# ── Get column info + suggestions ─────────────────────────────────

@router.get("/info/{file_id}")
async def get_info(file_id: str):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    file_doc = await db.files.find_one({"file_id": file_id})
    if not file_doc:
        raise HTTPException(404, "File not found")

    df = load_file_to_df(file_doc["file_path"], file_doc["filename"])
    if df is None:
        raise HTTPException(500, "Could not load file")

    col_types    = get_column_types(df)
    col_stats    = [get_column_stats(df, col) for col in df.columns]
    suggestions  = get_suggested_transforms(df)

    return {
        "file_id":     file_id,
        "filename":    file_doc["filename"],
        "row_count":   len(df),
        "col_count":   len(df.columns),
        "columns":     df.columns.tolist(),
        "col_types":   col_types,
        "col_stats":   col_stats,
        "suggestions": suggestions,
    }


# ── Preview a single transformation ───────────────────────────────

@router.post("/preview")
async def preview_transform(request: TransformRequest):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    file_doc = await db.files.find_one({"file_id": request.file_id})
    if not file_doc:
        raise HTTPException(404, "File not found")

    df = load_file_to_df(file_doc["file_path"], file_doc["filename"])
    if df is None:
        raise HTTPException(500, "Could not load file")

    if request.col not in df.columns:
        raise HTTPException(400, f"Column '{request.col}' not found")

    # Stats before
    before_stats = get_column_stats(df, request.col)

    # Apply
    df_new, new_col, msg = apply_transformation(
        df, request.col, request.transform, request.col2, request.new_col_name
    )

    if not msg or (not new_col and "Error" in msg):
        raise HTTPException(400, msg or "Transformation failed")

    # Stats after
    after_col   = new_col if new_col and new_col in df_new.columns else request.col
    after_stats = get_column_stats(df_new, after_col) if after_col in df_new.columns else {}

    # Sample preview (before vs after)
    sample_before = df[request.col].head(8).tolist()
    sample_after  = df_new[after_col].head(8).tolist() if after_col in df_new.columns else []

    return {
        "message":      msg,
        "new_col":      new_col,
        "before_stats": before_stats,
        "after_stats":  after_stats,
        "sample_before": [str(v) if v is not None else None for v in sample_before],
        "sample_after":  [str(round(v, 4)) if isinstance(v, float) else str(v) if v is not None else None for v in sample_after],
    }


# ── Apply transformation and save as new dataset ──────────────────

@router.post("/apply")
async def apply_transform(request: TransformRequest):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    file_doc = await db.files.find_one({"file_id": request.file_id})
    if not file_doc:
        raise HTTPException(404, "File not found")

    df = load_file_to_df(file_doc["file_path"], file_doc["filename"])
    if df is None:
        raise HTTPException(500, "Could not load file")

    # Load existing engineered df if session exists
    session = await db.fe_sessions.find_one({"file_id": request.file_id})
    if session and os.path.exists(session.get("current_path", "")):
        df = load_file_to_df(session["current_path"], "temp.csv")

    df_new, new_col, msg = apply_transformation(
        df, request.col, request.transform, request.col2, request.new_col_name
    )

    if "Error" in msg:
        raise HTTPException(400, msg)

    # Save updated df
    new_path = save_df_to_temp_csv(df_new)

    # Upsert session
    step = {
        "col": request.col, "transform": request.transform,
        "col2": request.col2, "new_col": new_col, "msg": msg,
        "applied_at": datetime.utcnow().isoformat(),
    }

    if session:
        await db.fe_sessions.update_one(
            {"file_id": request.file_id},
            {"$set":  {"current_path": new_path, "updated_at": datetime.utcnow()},
             "$push": {"steps": step}}
        )
    else:
        await db.fe_sessions.insert_one({
            "file_id":      request.file_id,
            "original_path": file_doc["file_path"],
            "current_path": new_path,
            "steps":        [step],
            "created_at":   datetime.utcnow(),
            "updated_at":   datetime.utcnow(),
        })

    return {
        "message":   msg,
        "new_col":   new_col,
        "row_count": len(df_new),
        "col_count": len(df_new.columns),
        "columns":   df_new.columns.tolist(),
        "steps_done": (session["steps"] if session else []) + [step],
    }


# ── Get current session state ──────────────────────────────────────

@router.get("/session/{file_id}")
async def get_session(file_id: str):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    session = await db.fe_sessions.find_one({"file_id": file_id})
    if not session:
        return {"file_id": file_id, "steps": [], "columns": []}

    session.pop("_id", None)

    # Load current df for column info
    if os.path.exists(session.get("current_path", "")):
        df = load_file_to_df(session["current_path"], "temp.csv")
        if df is not None:
            session["columns"]   = df.columns.tolist()
            session["row_count"] = len(df)
            session["col_types"] = get_column_types(df)

    return session


# ── Preview current engineered data ───────────────────────────────

@router.get("/preview/{file_id}")
async def preview_data(file_id: str, rows: int = 50):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    session = await db.fe_sessions.find_one({"file_id": file_id})

    if session and os.path.exists(session.get("current_path", "")):
        df = load_file_to_df(session["current_path"], "temp.csv")
    else:
        file_doc = await db.files.find_one({"file_id": file_id})
        if not file_doc:
            raise HTTPException(404, "File not found")
        df = load_file_to_df(file_doc["file_path"], file_doc["filename"])

    if df is None:
        raise HTTPException(500, "Could not load data")

    for col in df.columns:
        if str(df[col].dtype).startswith("datetime"):
            df[col] = df[col].astype(str)

    return {
        "columns":   df.columns.tolist(),
        "rows":      df.head(rows).fillna("").to_dict(orient="records"),
        "row_count": len(df),
        "col_count": len(df.columns),
    }


# ── Download engineered dataset ────────────────────────────────────

@router.get("/download/{file_id}")
async def download_engineered(file_id: str):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    session = await db.fe_sessions.find_one({"file_id": file_id})
    if not session or not os.path.exists(session.get("current_path", "")):
        raise HTTPException(404, "No engineered dataset found. Apply transformations first.")

    file_doc = await db.files.find_one({"file_id": file_id})
    orig_name = file_doc["filename"].rsplit(".", 1)[0] if file_doc else "data"

    return FileResponse(
        session["current_path"],
        media_type="text/csv",
        filename=f"{orig_name}_engineered.csv"
    )


# ── Reset session ──────────────────────────────────────────────────

@router.delete("/session/{file_id}")
async def reset_session(file_id: str):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    await db.fe_sessions.delete_one({"file_id": file_id})
    return {"message": "Feature engineering session reset"}
