import pandas as pd
import duckdb
import csv
import tempfile
import os
from typing import Optional, Tuple
import numpy as np
from io import StringIO
import logging

logger = logging.getLogger(__name__)


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
    """Load a CSV or Excel file into a DataFrame with error handling."""
    try:
        if not file_path:
            logger.error(f"Empty file_path provided")
            return None
            
        if filename.endswith('.csv'):
            if not os.path.exists(file_path):
                logger.error(f"CSV file not found at: {file_path}")
                return None
            df = pd.read_csv(file_path, encoding='utf-8', na_values=['NA', 'N/A', 'missing'])
        elif filename.endswith(('.xlsx', '.xls')):
            if not os.path.exists(file_path):
                logger.error(f"Excel file not found at: {file_path}")
                return None
            df = pd.read_excel(file_path, na_values=['NA', 'N/A', 'missing'])
        else:
            logger.error(f"Unsupported file type: {filename}")
            return None
        
        logger.info(f"✓ Loaded file: {filename} ({len(df)} rows, {len(df.columns)} cols)")
        return preprocess_dataframe(df)
    except Exception as e:
        logger.error(f"Error loading file {filename}: {str(e)}")
        return None


def load_dataframe_from_csv_string(csv_string: str) -> Optional[pd.DataFrame]:
    """Load a DataFrame from a CSV string (for MongoDB-stored data)."""
    try:
        if not csv_string:
            logger.error("Empty CSV string provided")
            return None
        df = pd.read_csv(StringIO(csv_string))
        logger.info(f"✓ Loaded dataframe from CSV string ({len(df)} rows, {len(df.columns)} cols)")
        return df
    except Exception as e:
        logger.error(f"Error parsing CSV string: {str(e)}")
        return None


def dataframe_to_csv_string(df: pd.DataFrame) -> str:
    """Convert a DataFrame to a CSV string for MongoDB storage."""
    try:
        csv_string = df.to_csv(index=False)
        logger.info(f"✓ Converted dataframe to CSV string ({len(df)} rows)")
        return csv_string
    except Exception as e:
        logger.error(f"Error converting dataframe to CSV: {str(e)}")
        return ""


def dataframe_to_json_records(df: pd.DataFrame) -> list:
    """Convert a DataFrame to JSON records for MongoDB storage."""
    try:
        # Handle datetime columns
        df_copy = df.copy()
        for col in df_copy.columns:
            if pd.api.types.is_datetime64_any_dtype(df_copy[col]):
                df_copy[col] = df_copy[col].astype(str)
        
        records = df_copy.to_dict(orient='records')
        logger.info(f"✓ Converted dataframe to {len(records)} JSON records")
        return records
    except Exception as e:
        logger.error(f"Error converting dataframe to JSON: {str(e)}")
        return []


def save_df_to_temp_csv(df: pd.DataFrame) -> str:
    """Save a DataFrame to a temporary CSV file and return the path.
    
    DEPRECATED: Use MongoDB CSV string storage instead.
    Only kept for legacy support during migration.
    """
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.csv', mode='w') as f:
            df.to_csv(f, index=False, quoting=csv.QUOTE_ALL)
            logger.warning(f"⚠️  Using temporary filesystem storage: {f.name}")
            return f.name
    except Exception as e:
        logger.error(f"Error saving temp CSV: {str(e)}")
        return ""


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
    """Execute SQL query on a CSV file using DuckDB with error handling."""
    conn = None
    try:
        if not os.path.exists(csv_path):
            logger.error(f"CSV file not found: {csv_path}")
            return None, f"File not found: {csv_path}"
        
        conn = duckdb.connect(database=':memory:')
        conn.execute(f"CREATE TABLE uploaded_data AS SELECT * FROM read_csv_auto('{csv_path}')")
        result = conn.execute(sql).fetchdf()
        
        # Convert to JSON-serializable format
        result = result.replace({np.nan: None})
        records = result.to_dict(orient='records')
        columns = result.columns.tolist()
        
        logger.info(f"✓ SQL query executed ({len(records)} records, {len(columns)} columns)")
        return {"records": records, "columns": columns}, None
    except Exception as e:
        logger.error(f"SQL execution error on {csv_path}: {str(e)}")
        return None, f"Query execution failed: {str(e)}"
    finally:
        if conn:
            conn.close()


def execute_sql_on_csv_string(csv_string: str, sql: str) -> Tuple[Optional[dict], Optional[str]]:
    """Execute SQL query on CSV string data using DuckDB."""
    conn = None
    try:
        if not csv_string:
            logger.error("Empty CSV string provided")
            return None, "CSV data is empty"
        
        conn = duckdb.connect(database=':memory:')
        df = pd.read_csv(StringIO(csv_string))
        conn.register('uploaded_data', df)
        
        result = conn.execute(sql).fetchdf()
        
        # Convert to JSON-serializable format
        result = result.replace({np.nan: None})
        records = result.to_dict(orient='records')
        columns = result.columns.tolist()
        
        logger.info(f"✓ SQL query on CSV string executed ({len(records)} records)")
        return {"records": records, "columns": columns}, None
    except Exception as e:
        logger.error(f"SQL execution error on CSV string: {str(e)}")
        return None, f"Query execution failed: {str(e)}"
    finally:
        if conn:
            conn.close()
