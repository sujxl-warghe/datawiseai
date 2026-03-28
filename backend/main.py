from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routers import files, query, history, ml, features, reports, auth
from utils.database import connect_db, close_db
import os

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    os.getenv("FRONTEND_URL", ""),          # e.g. https://datawiseai.vercel.app
    os.getenv("FRONTEND_URL_WWW", ""),      # e.g. https://www.datawiseai.vercel.app
]
ALLOWED_ORIGINS = [o for o in ALLOWED_ORIGINS if o]  # remove empty

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    for folder in ["MODELS_DIR", "UPLOAD_DIR", "REPORTS_DIR"]:
        os.makedirs(os.getenv(folder, f"./{folder.lower().replace('_dir','')}s"), exist_ok=True)
    yield
    await close_db()

app = FastAPI(
    title="DataWiseAI API",
    description="AI-powered data analyst platform",
    version="4.0.0",
    lifespan=lifespan,
    docs_url="/docs" if os.getenv("ENV") != "production" else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(files.router,    prefix="/api/files",    tags=["Files"])
app.include_router(query.router,    prefix="/api/query",    tags=["Query"])
app.include_router(history.router,  prefix="/api/history",  tags=["History"])
app.include_router(ml.router,       prefix="/api/ml",       tags=["ML"])
app.include_router(features.router, prefix="/api/features", tags=["Features"])
app.include_router(reports.router,  prefix="/api/reports",  tags=["Reports"])
app.include_router(auth.router,     prefix="/api/auth",     tags=["Auth"])

@app.get("/")
async def root():
    return {"message": "DataWiseAI API v4.0", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
