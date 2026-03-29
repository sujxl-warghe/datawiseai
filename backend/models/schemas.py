from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime
from bson import ObjectId


class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(v)


class ColumnMeta(BaseModel):
    name: str
    dtype: str
    missing: int = 0
    unique: int = 0
    min: Optional[float] = None
    max: Optional[float] = None
    mean: Optional[float] = None
    std: Optional[float] = None


class FileRecord(BaseModel):
    file_id: str
    filename: str
    file_path: str
    file_size: int
    row_count: int
    column_count: int
    columns: List[ColumnMeta]
    missing_values: int = 0
    memory_usage_kb: float = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    csv_path: Optional[str] = None  # preprocessed CSV path for DuckDB


class FileResponse(BaseModel):
    file_id: str
    filename: str
    file_size: int
    row_count: int
    column_count: int
    columns: List[ColumnMeta]
    missing_values: int
    memory_usage_kb: float
    created_at: datetime


class QueryRequest(BaseModel):
    file_id: str
    user_query: str
    openai_api_key: str


class QueryResult(BaseModel):
    records: List[Dict[str, Any]]
    columns: List[str]


class QueryResponse(BaseModel):
    query_id: Optional[str] = None
    file_id: str
    user_query: str
    sql: Optional[str] = None
    explanation: Optional[str] = None
    insight: str
    result: Optional[QueryResult] = None
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str
    sql: Optional[str] = None
    result: Optional[QueryResult] = None
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ChatSession(BaseModel):
    session_id: str
    file_id: str
    filename: str
    messages: List[ChatMessage] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
