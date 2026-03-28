from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import List, Optional
import json
from datetime import datetime

from services.file_service import save_upload_file, generate_file_id, delete_file, get_file_size
from utils.data_processor import load_file_to_df, get_dataframe_summary, save_df_to_temp_csv
from utils.database import get_db
from models.schemas import FileRecord, FileResponse

router = APIRouter()

ALLOWED_TYPES = {
    "text/csv", "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}
ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


@router.post("/upload", response_model=FileResponse)
async def upload_file(file: UploadFile = File(...)):
    """Upload a CSV or Excel file for analysis."""
    import os
    from pathlib import Path

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    file_id = generate_file_id()

    try:
        file_path = await save_upload_file(file, file_id)
    except Exception as e:
        raise HTTPException(500, f"Failed to save file: {e}")

    file_size = get_file_size(file_path)
    if file_size > MAX_FILE_SIZE:
        delete_file(file_path)
        raise HTTPException(400, "File too large. Maximum size is 50MB.")

    df = load_file_to_df(file_path, file.filename)
    if df is None:
        delete_file(file_path)
        raise HTTPException(400, "Failed to parse file. Please check the format.")

    summary = get_dataframe_summary(df)
    csv_path = save_df_to_temp_csv(df)

    record = {
        "file_id": file_id,
        "filename": file.filename,
        "file_path": file_path,
        "csv_path": csv_path,
        "file_size": file_size,
        "row_count": summary["row_count"],
        "column_count": summary["column_count"],
        "columns": summary["columns"],
        "missing_values": summary["missing_values"],
        "memory_usage_kb": summary["memory_usage_kb"],
        "created_at": datetime.utcnow(),
    }

    db = get_db()
    if db is not None:
        await db.files.insert_one(record)

    return FileResponse(
        file_id=file_id,
        filename=file.filename,
        file_size=file_size,
        row_count=summary["row_count"],
        column_count=summary["column_count"],
        columns=summary["columns"],
        missing_values=summary["missing_values"],
        memory_usage_kb=summary["memory_usage_kb"],
        created_at=record["created_at"],
    )


@router.get("/", response_model=List[FileResponse])
async def list_files(limit: int = Query(20, ge=1, le=100)):
    """List all uploaded files."""
    db = get_db()
    if db is None:
        return []

    cursor = db.files.find({}).sort("created_at", -1).limit(limit)
    files = []
    async for doc in cursor:
        doc.pop("_id", None)
        doc.pop("file_path", None)
        doc.pop("csv_path", None)
        files.append(FileResponse(**doc))
    return files


@router.get("/{file_id}", response_model=FileResponse)
async def get_file(file_id: str):
    """Get file metadata."""
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    doc = await db.files.find_one({"file_id": file_id})
    if not doc:
        raise HTTPException(404, "File not found")

    doc.pop("_id", None)
    doc.pop("file_path", None)
    doc.pop("csv_path", None)
    return FileResponse(**doc)


@router.get("/{file_id}/preview")
async def preview_file(file_id: str, rows: int = Query(50, ge=1, le=500)):
    """Get a preview of the file data."""
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    doc = await db.files.find_one({"file_id": file_id})
    if not doc:
        raise HTTPException(404, "File not found")

    from utils.data_processor import load_file_to_df
    df = load_file_to_df(doc["file_path"], doc["filename"])
    if df is None:
        raise HTTPException(500, "Failed to load file data")

    # Convert datetime columns to string for JSON serialization
    for col in df.columns:
        if df[col].dtype == 'datetime64[ns]':
            df[col] = df[col].dt.strftime('%Y-%m-%d').fillna('')

    preview_df = df.head(rows)
    return {
        "columns": df.columns.tolist(),
        "rows": preview_df.fillna("").to_dict(orient="records"),
        "total_rows": len(df),
    }


@router.delete("/{file_id}")
async def delete_file_record(file_id: str):
    """Delete a file and its records."""
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    doc = await db.files.find_one({"file_id": file_id})
    if not doc:
        raise HTTPException(404, "File not found")

    delete_file(doc.get("file_path", ""))
    delete_file(doc.get("csv_path", ""))

    await db.files.delete_one({"file_id": file_id})
    await db.queries.delete_many({"file_id": file_id})
    await db.sessions.delete_many({"file_id": file_id})

    return {"message": "File deleted successfully"}
