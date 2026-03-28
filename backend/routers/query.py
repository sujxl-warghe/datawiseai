import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from datetime import datetime
import uuid
import json

from models.schemas import QueryRequest, QueryResponse, QueryResult, ChatMessage, ChatSession
from services.llm_service import generate_sql_and_insight, generate_insight_from_results, build_schema_info
from utils.data_processor import execute_sql_on_csv
from utils.database import get_db

router = APIRouter()


@router.post("/ask", response_model=QueryResponse)
async def ask_query(request: QueryRequest):
    """Process a natural language query against a dataset."""
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    # Get file record
    file_doc = await db.files.find_one({"file_id": request.file_id})
    if not file_doc:
        raise HTTPException(404, "File not found. Please upload the file first.")

    csv_path = file_doc.get("csv_path")
    if not csv_path:
        raise HTTPException(400, "File CSV path not found.")

    columns = [col["name"] for col in file_doc["columns"]]
    schema_info = build_schema_info(file_doc["columns"])

    # Generate SQL using LLM
    llm_result, llm_error = await generate_sql_and_insight(
        user_query=request.user_query,
        columns=columns,
        schema_info=schema_info,
        api_key=request.openai_api_key,
    )

    if llm_error:
        raise HTTPException(500, f"LLM processing failed: {llm_error}")

    sql = llm_result.get("sql")
    explanation = llm_result.get("explanation", "")
    initial_insight = llm_result.get("insight", "")

    query_result = None
    error_msg = None
    final_insight = initial_insight

    if sql:
        result_data, exec_error = execute_sql_on_csv(csv_path, sql)
        if exec_error:
            error_msg = exec_error
            final_insight = f"Query execution failed: {exec_error}. {initial_insight}"
        else:
            query_result = QueryResult(
                records=result_data["records"],
                columns=result_data["columns"],
            )
            # Generate insight from actual results
            final_insight = await generate_insight_from_results(
                user_query=request.user_query,
                sql=sql,
                results=result_data["records"],
                api_key=request.openai_api_key,
            )

    query_id = str(uuid.uuid4())
    created_at = datetime.utcnow()

    # Save to DB
    query_doc = {
        "query_id": query_id,
        "file_id": request.file_id,
        "user_query": request.user_query,
        "sql": sql,
        "explanation": explanation,
        "insight": final_insight,
        "result": query_result.dict() if query_result else None,
        "error": error_msg,
        "created_at": created_at,
    }
    await db.queries.insert_one(query_doc)

    return QueryResponse(
        query_id=query_id,
        file_id=request.file_id,
        user_query=request.user_query,
        sql=sql,
        explanation=explanation,
        insight=final_insight,
        result=query_result,
        error=error_msg,
        created_at=created_at,
    )


@router.post("/session/{session_id}/message")
async def send_message(session_id: str, request: QueryRequest):
    """Send a message in a chat session."""
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    # Check or create session
    session = await db.sessions.find_one({"session_id": session_id})
    if not session:
        file_doc = await db.files.find_one({"file_id": request.file_id})
        if not file_doc:
            raise HTTPException(404, "File not found")
        session = {
            "session_id": session_id,
            "file_id": request.file_id,
            "filename": file_doc["filename"],
            "messages": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        await db.sessions.insert_one(session)

    # Process the query
    response = await ask_query(request)

    # Build assistant message
    user_msg = {
        "role": "user",
        "content": request.user_query,
        "created_at": datetime.utcnow(),
    }
    assistant_msg = {
        "role": "assistant",
        "content": response.insight,
        "sql": response.sql,
        "result": response.result.dict() if response.result else None,
        "error": response.error,
        "created_at": datetime.utcnow(),
    }

    await db.sessions.update_one(
        {"session_id": session_id},
        {
            "$push": {"messages": {"$each": [user_msg, assistant_msg]}},
            "$set": {"updated_at": datetime.utcnow()},
        },
    )

    return response


@router.get("/session/{session_id}")
async def get_session(session_id: str):
    """Get chat session history."""
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    session = await db.sessions.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(404, "Session not found")

    session.pop("_id", None)
    return session


@router.post("/session/new")
async def create_session(file_id: str):
    """Create a new chat session for a file."""
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    file_doc = await db.files.find_one({"file_id": file_id})
    if not file_doc:
        raise HTTPException(404, "File not found")

    session_id = str(uuid.uuid4())
    session = {
        "session_id": session_id,
        "file_id": file_id,
        "filename": file_doc["filename"],
        "messages": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    await db.sessions.insert_one(session)
    session.pop("_id", None)
    return session
