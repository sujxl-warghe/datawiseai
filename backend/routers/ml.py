import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os
import joblib

from utils.database import get_db
from utils.data_processor import load_file_to_df
from services.ml_service import (
    train_model, get_ai_suggestions, generate_eda_charts, get_algorithms,
    preprocess_for_ml
)

router = APIRouter()
MODELS_DIR = os.getenv("MODELS_DIR", "./models")


# ── Request Models ─────────────────────────────────────────────────

class TrainRequest(BaseModel):
    file_id: str
    target_col: str
    feature_cols: List[str]
    task_type: str
    algorithm: str = "auto"
    test_size: float = 0.2
    auto_tune: bool = False
    model_name: Optional[str] = None   # user-given name for saved model


class PredictRequest(BaseModel):
    model_id: str
    data: List[dict]


# ── Auto Algorithm Selection ───────────────────────────────────────

async def auto_select_algorithm(df, target_col, feature_cols, task_type) -> dict:
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import cross_val_score

    X, y, _ = preprocess_for_ml(df, target_col, feature_cols)
    from sklearn.preprocessing import StandardScaler
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    algorithms = get_algorithms(task_type)
    scoring = 'accuracy' if task_type == 'classification' else 'r2'

    results = {}
    for name, model in algorithms.items():
        try:
            scores = cross_val_score(model, X_scaled, y, cv=3, scoring=scoring, n_jobs=-1)
            results[name] = {'mean': round(float(scores.mean()), 4), 'std': round(float(scores.std()), 4)}
        except Exception:
            continue

    if not results:
        return {'best': 'random_forest', 'scores': {}}

    best = max(results, key=lambda k: results[k]['mean'])
    return {'best': best, 'scores': results}


# ── Train ──────────────────────────────────────────────────────────

@router.post("/train")
async def train(request: TrainRequest):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    file_doc = await db.files.find_one({"file_id": request.file_id})
    if not file_doc:
        raise HTTPException(404, "File not found")

    df = load_file_to_df(file_doc["file_path"], file_doc["filename"])
    if df is None:
        raise HTTPException(500, "Could not load file data")

    all_cols = df.columns.tolist()
    if request.target_col not in all_cols:
        raise HTTPException(400, f"Target column '{request.target_col}' not found")
    invalid = [c for c in request.feature_cols if c not in all_cols]
    if invalid:
        raise HTTPException(400, f"Invalid feature columns: {invalid}")

    # Auto algorithm selection
    algorithm = request.algorithm
    algo_comparison = None
    if request.algorithm == "auto" and request.task_type in ("classification", "regression"):
        try:
            auto_result = await auto_select_algorithm(df, request.target_col, request.feature_cols, request.task_type)
            algorithm = auto_result['best']
            algo_comparison = auto_result['scores']
        except Exception:
            algorithm = 'random_forest'

    try:
        result = train_model(
            df=df,
            target_col=request.target_col,
            feature_cols=request.feature_cols,
            task_type=request.task_type,
            algorithm=algorithm,
            test_size=request.test_size,
            auto_tune=request.auto_tune,
        )
    except Exception as e:
        raise HTTPException(500, f"Training failed: {str(e)}")

    df_info = {'missing_pct': df.isnull().sum().sum() / (len(df) * len(df.columns)) * 100}
    suggestions = get_ai_suggestions(result['metrics'], request.task_type, algorithm, df_info)

    if algo_comparison:
        result['algo_comparison'] = algo_comparison
        result['auto_selected'] = True

    result['suggestions'] = suggestions

    # Save to DB — include model_name and file info
    db_doc = {
        **{k: v for k, v in result.items() if k != 'charts'},
        'file_id':    request.file_id,
        'filename':   file_doc['filename'],
        'model_name': request.model_name or f"{algorithm}_{request.task_type}",
        'chart_keys': list(result.get('charts', {}).keys()),
        'saved':      False,   # not explicitly saved yet
    }
    await db.ml_models.insert_one(db_doc)

    return result


# ── Save Model ─────────────────────────────────────────────────────

@router.post("/models/{model_id}/save")
async def save_model(model_id: str, name: Optional[str] = None):
    """Mark a model as explicitly saved with an optional name."""
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    doc = await db.ml_models.find_one({"model_id": model_id})
    if not doc:
        raise HTTPException(404, "Model not found in database")

    model_path = os.path.join(MODELS_DIR, f"{model_id}.pkl")
    if not os.path.exists(model_path):
        raise HTTPException(404, "Model file not found on disk")

    update = {"saved": True}
    if name:
        update["model_name"] = name

    await db.ml_models.update_one({"model_id": model_id}, {"$set": update})
    return {"message": "Model saved successfully", "model_id": model_id}


# ── List Saved Models ──────────────────────────────────────────────

@router.get("/saved")
async def list_saved_models():
    """List all explicitly saved models across all files."""
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    cursor = db.ml_models.find({"saved": True}).sort("trained_at", -1)
    models = []
    async for doc in cursor:
        doc.pop("_id", None)
        # Check if .pkl file still exists
        model_path = os.path.join(MODELS_DIR, f"{doc['model_id']}.pkl")
        doc['file_exists'] = os.path.exists(model_path)
        models.append(doc)
    return models


# ── List Models for a file ─────────────────────────────────────────

@router.get("/models/{file_id}")
async def list_models(file_id: str):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    cursor = db.ml_models.find({"file_id": file_id}).sort("trained_at", -1)
    models = []
    async for doc in cursor:
        doc.pop("_id", None)
        model_path = os.path.join(MODELS_DIR, f"{doc['model_id']}.pkl")
        doc['file_exists'] = os.path.exists(model_path)
        models.append(doc)
    return models


# ── Download ───────────────────────────────────────────────────────

@router.get("/models/{file_id}/{model_id}/download")
async def download_model(file_id: str, model_id: str):
    db = get_db()
    doc = None
    if db is not None:
        doc = await db.ml_models.find_one({"model_id": model_id})

    model_path = os.path.join(MODELS_DIR, f"{model_id}.pkl")
    if not os.path.exists(model_path):
        raise HTTPException(404, "Model file not found")

    name = (doc.get('model_name') or model_id[:8]).replace(' ', '_')
    return FileResponse(
        model_path,
        media_type="application/octet-stream",
        filename=f"{name}.pkl"
    )


# ── EDA ────────────────────────────────────────────────────────────

@router.get("/eda/{file_id}")
async def get_eda(file_id: str):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    file_doc = await db.files.find_one({"file_id": file_id})
    if not file_doc:
        raise HTTPException(404, "File not found")

    df = load_file_to_df(file_doc["file_path"], file_doc["filename"])
    if df is None:
        raise HTTPException(500, "Could not load file")

    try:
        charts = generate_eda_charts(df)
    except Exception as e:
        raise HTTPException(500, f"Chart generation failed: {str(e)}")

    return {
        'file_id': file_id,
        'charts': charts,
        'numeric_cols': df.select_dtypes(include='number').columns.tolist(),
        'categorical_cols': df.select_dtypes(include='object').columns.tolist(),
    }


# ── Auto Select ────────────────────────────────────────────────────

@router.get("/auto-select")
async def auto_select(file_id: str, target_col: str, feature_cols: str, task_type: str):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    file_doc = await db.files.find_one({"file_id": file_id})
    if not file_doc:
        raise HTTPException(404, "File not found")

    df = load_file_to_df(file_doc["file_path"], file_doc["filename"])
    if df is None:
        raise HTTPException(500, "Could not load file")

    cols = [c.strip() for c in feature_cols.split(',')]
    result = await auto_select_algorithm(df, target_col, cols, task_type)
    sorted_scores = dict(sorted(result['scores'].items(), key=lambda x: x[1]['mean'], reverse=True))
    return {'best_algorithm': result['best'], 'scores': sorted_scores, 'task_type': task_type}


# ── Predict ────────────────────────────────────────────────────────

@router.post("/predict/{model_id}")
async def predict(model_id: str, request: PredictRequest):
    import pandas as pd

    model_path = os.path.join(MODELS_DIR, f"{model_id}.pkl")
    if not os.path.exists(model_path):
        raise HTTPException(404, "Model not found")

    try:
        bundle      = joblib.load(model_path)
        model       = bundle['model']
        scaler      = bundle['scaler']
        encoders    = bundle['encoders']
        feature_cols= bundle['feature_cols']

        df = pd.DataFrame(request.data)
        for col, le in encoders.items():
            if col in df.columns and col != bundle['target_col']:
                df[col] = df[col].astype(str)
                known   = set(le.classes_)
                df[col] = df[col].apply(lambda x: x if x in known else le.classes_[0])
                df[col] = le.transform(df[col])

        df          = df[feature_cols].fillna(0)
        X           = scaler.transform(df.values)
        predictions = model.predict(X).tolist()
        return {'model_id': model_id, 'predictions': predictions, 'count': len(predictions)}
    except Exception as e:
        raise HTTPException(500, f"Prediction failed: {str(e)}")


# ── Delete ─────────────────────────────────────────────────────────

@router.delete("/models/{model_id}")
async def delete_model(model_id: str):
    db = get_db()
    model_path = os.path.join(MODELS_DIR, f"{model_id}.pkl")
    if os.path.exists(model_path):
        os.remove(model_path)
    if db is not None:
        await db.ml_models.delete_one({"model_id": model_id})
    return {"message": "Model deleted"}


# ── Model Comparison ───────────────────────────────────────────────

class CompareRequest(BaseModel):
    file_id:      str
    target_col:   str
    feature_cols: List[str]
    task_type:    str
    test_size:    float = 0.2


@router.post("/compare")
async def compare_models(request: CompareRequest):
    """Train all algorithms and return comparison results."""
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    file_doc = await db.files.find_one({"file_id": request.file_id})
    if not file_doc:
        raise HTTPException(404, "File not found")

    df = load_file_to_df(file_doc["file_path"], file_doc["filename"])
    if df is None:
        raise HTTPException(500, "Could not load file")

    from services.ml_service import preprocess_for_ml, get_algorithms
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import cross_val_score, train_test_split
    from sklearn.metrics import (
        accuracy_score, f1_score, precision_score, recall_score,
        r2_score, mean_absolute_error, mean_squared_error
    )
    import numpy as np
    import time

    try:
        X, y, _ = preprocess_for_ml(df, request.target_col, request.feature_cols)
        scaler  = StandardScaler()
        X_scaled= scaler.fit_transform(X)
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=request.test_size, random_state=42
        )
    except Exception as e:
        raise HTTPException(400, f"Data preprocessing failed: {str(e)}")

    algorithms  = get_algorithms(request.task_type)
    scoring     = 'accuracy' if request.task_type == 'classification' else 'r2'
    results     = []

    for name, model in algorithms.items():
        try:
            start = time.time()
            model.fit(X_train, y_train)
            train_time = round(time.time() - start, 3)
            y_pred  = model.predict(X_test)
            cv      = cross_val_score(model, X_scaled, y, cv=5, scoring=scoring, n_jobs=-1)

            if request.task_type == 'classification':
                metrics = {
                    'accuracy':  round(float(accuracy_score(y_test, y_pred)), 4),
                    'f1_score':  round(float(f1_score(y_test, y_pred, average='weighted', zero_division=0)), 4),
                    'precision': round(float(precision_score(y_test, y_pred, average='weighted', zero_division=0)), 4),
                    'recall':    round(float(recall_score(y_test, y_pred, average='weighted', zero_division=0)), 4),
                    'cv_mean':   round(float(cv.mean()), 4),
                    'cv_std':    round(float(cv.std()), 4),
                }
                primary = metrics['accuracy']
            else:
                mse = mean_squared_error(y_test, y_pred)
                metrics = {
                    'r2_score': round(float(r2_score(y_test, y_pred)), 4),
                    'mae':      round(float(mean_absolute_error(y_test, y_pred)), 4),
                    'rmse':     round(float(np.sqrt(mse)), 4),
                    'cv_mean':  round(float(cv.mean()), 4),
                    'cv_std':   round(float(cv.std()), 4),
                }
                primary = metrics['r2_score']

            results.append({
                'algorithm':  name,
                'metrics':    metrics,
                'primary':    primary,
                'train_time': train_time,
            })
        except Exception:
            continue

    if not results:
        raise HTTPException(500, "All algorithms failed")

    results.sort(key=lambda x: x['primary'], reverse=True)
    results[0]['is_best'] = True

    return {
        'task_type':   request.task_type,
        'target_col':  request.target_col,
        'results':     results,
        'best':        results[0]['algorithm'],
        'train_size':  len(X_train),
        'test_size':   len(X_test),
    }


# ── Learning Curve ─────────────────────────────────────────────────

class LearningCurveRequest(BaseModel):
    file_id:      str
    target_col:   str
    feature_cols: List[str]
    task_type:    str
    algorithm:    str = 'random_forest'


@router.post("/learning-curve")
async def learning_curve(request: LearningCurveRequest):
    """Generate learning curve for a model."""
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    file_doc = await db.files.find_one({"file_id": request.file_id})
    if not file_doc:
        raise HTTPException(404, "File not found")

    df = load_file_to_df(file_doc["file_path"], file_doc["filename"])
    if df is None:
        raise HTTPException(500, "Could not load file")

    if len(df) < 50:
        raise HTTPException(400, "Need at least 50 rows for learning curve")

    try:
        from services.ml_service import generate_learning_curve
        result = generate_learning_curve(
            df=df,
            target_col=request.target_col,
            feature_cols=request.feature_cols,
            task_type=request.task_type,
            algorithm=request.algorithm,
        )
        return result
    except Exception as e:
        raise HTTPException(500, f"Learning curve failed: {str(e)}")
