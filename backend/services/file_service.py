import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import os
import shutil
import uuid
from pathlib import Path
from fastapi import UploadFile
from dotenv import load_dotenv

load_dotenv()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)


def generate_file_id() -> str:
    return str(uuid.uuid4())


def get_upload_path(file_id: str, filename: str) -> str:
    ext = Path(filename).suffix
    return os.path.join(UPLOAD_DIR, f"{file_id}{ext}")


async def save_upload_file(upload_file: UploadFile, file_id: str) -> str:
    """Save an uploaded file and return the path."""
    dest_path = get_upload_path(file_id, upload_file.filename)
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
    return dest_path


def delete_file(file_path: str) -> bool:
    """Delete a file from the filesystem."""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
        return True
    except Exception:
        return False


def get_file_size(file_path: str) -> int:
    """Get file size in bytes."""
    return os.path.getsize(file_path) if os.path.exists(file_path) else 0
