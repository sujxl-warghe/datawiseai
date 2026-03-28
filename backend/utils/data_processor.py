import pandas as pd
import duckdb
import csv
import tempfile
import os
from typing import Optional, Tuple
import numpy as np


def preprocess_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Clean and preprocess a DataFrame."""
    # Replace common NA representations
    df = df.replace(['NA', 'N/A', 'missing', 'null', 'NULL', ''], np.nan)

    for col in df.columns:
        # Parse date columns
        if 'date' in col.lower() or 'time' in col.lower():
            try:
                df[col] = pd.to_datetime(df[col], errors='coerce')
            except Exception:
                pass
        elif df[col].dtype == 'object':
            # Try numeric conversion
            try:
                converted = pd.to_numeric(df[col], errors='coerce')
                if converted.notna().sum() > 0.5 * len(df):
                    df[col] = converted
            except Exception:
                pass

    return df


def load_file_to_df(file_path: str, filename: str) -> Optional[pd.DataFrame]:
    """Load a CSV or Excel file into a DataFrame."""
    try:
        if filename.endswith('.csv'):
            df = pd.read_csv(file_path, encoding='utf-8', na_values=['NA', 'N/A', 'missing'])
        elif filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file_path, na_values=['NA', 'N/A', 'missing'])
        else:
            return None
        return preprocess_dataframe(df)
    except Exception as e:
        print(f"Error loading file: {e}")
        return None


def save_df_to_temp_csv(df: pd.DataFrame) -> str:
    """Save a DataFrame to a temporary CSV file and return the path."""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.csv', mode='w') as f:
        df.to_csv(f, index=False, quoting=csv.QUOTE_ALL)
        return f.name


def get_dataframe_summary(df: pd.DataFrame) -> dict:
    """Generate summary statistics for a DataFrame."""
    summary = {
        "row_count": len(df),
        "column_count": len(df.columns),
        "columns": [],
        "missing_values": int(df.isnull().sum().sum()),
        "memory_usage_kb": round(df.memory_usage(deep=True).sum() / 1024, 2),
    }

    for col in df.columns:
        col_info = {
            "name": col,
            "dtype": str(df[col].dtype),
            "missing": int(df[col].isnull().sum()),
            "unique": int(df[col].nunique()),
        }

        if pd.api.types.is_numeric_dtype(df[col]):
            stats = df[col].describe()
            col_info.update({
                "min": round(float(stats.get('min', 0)), 4) if not pd.isna(stats.get('min')) else None,
                "max": round(float(stats.get('max', 0)), 4) if not pd.isna(stats.get('max')) else None,
                "mean": round(float(stats.get('mean', 0)), 4) if not pd.isna(stats.get('mean')) else None,
                "std": round(float(stats.get('std', 0)), 4) if not pd.isna(stats.get('std')) else None,
            })

        summary["columns"].append(col_info)

    return summary


def execute_sql_on_csv(csv_path: str, sql: str) -> Tuple[Optional[list], Optional[str]]:
    """Execute SQL query on a CSV file using DuckDB."""
    conn = None
    try:
        conn = duckdb.connect(database=':memory:')
        conn.execute(f"CREATE TABLE uploaded_data AS SELECT * FROM read_csv_auto('{csv_path}')")
        result = conn.execute(sql).fetchdf()
        # Convert to JSON-serializable format
        result = result.replace({np.nan: None})
        records = result.to_dict(orient='records')
        columns = result.columns.tolist()
        return {"records": records, "columns": columns}, None
    except Exception as e:
        return None, str(e)
    finally:
        if conn:
            conn.close()
