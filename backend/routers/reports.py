from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import io

from utils.database import get_db
from utils.data_processor import load_file_to_df
from services.report_service import generate_report

router = APIRouter()


class ReportRequest(BaseModel):
    file_id:       str
    project_title: str  = "Data Analysis Report"
    student_name:  str  = ""
    institution:   str  = ""
    include_ml:    bool = True
    include_eda:   bool = True
    include_fe:    bool = True
    ml_model_id:   Optional[str] = None   # specific model, else latest


@router.post("/generate")
async def generate(request: ReportRequest):
    """Generate a PDF report for a dataset."""
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    # Load file
    file_doc = await db.files.find_one({"file_id": request.file_id})
    if not file_doc:
        raise HTTPException(404, "File not found")

    df = load_file_to_df(file_doc["file_path"], file_doc["filename"])
    if df is None:
        raise HTTPException(500, "Could not load file")

    # ML result
    ml_result = None
    if request.include_ml:
        if request.ml_model_id:
            ml_result = await db.ml_models.find_one({"model_id": request.ml_model_id})
        else:
            ml_result = await db.ml_models.find_one(
                {"file_id": request.file_id},
                sort=[("trained_at", -1)]
            )
        if ml_result:
            ml_result.pop("_id", None)
            # charts are NOT stored in DB — set to None
            ml_result["charts"] = None

    # EDA charts — regenerate on the fly
    eda_charts = None
    if request.include_eda:
        try:
            from services.ml_service import generate_eda_charts
            eda_charts = generate_eda_charts(df)
        except Exception:
            eda_charts = None

    # Feature engineering steps
    fe_steps = None
    if request.include_fe:
        fe_session = await db.fe_sessions.find_one({"file_id": request.file_id})
        if fe_session:
            fe_steps = fe_session.get("steps", [])

    # Generate PDF
    try:
        pdf_bytes = generate_report(
            filename=file_doc["filename"],
            df=df,
            ml_result=ml_result,
            fe_steps=fe_steps,
            eda_charts=eda_charts,
            project_title=request.project_title,
            student_name=request.student_name,
            institution=request.institution,
        )
    except Exception as e:
        raise HTTPException(500, f"PDF generation failed: {str(e)}")

    safe_name = file_doc["filename"].rsplit(".", 1)[0].replace(" ", "_")
    filename  = f"{safe_name}_report.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
