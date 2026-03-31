import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import pandas as pd
import numpy as np
import logging
from typing import Optional


logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


# ── Available Transformations ──────────────────────────────────────

TRANSFORMATIONS = {
    # Numeric
    "log":          {"label": "Log Transform",        "type": "numeric", "desc": "log(x+1) — skewed data fix"},
    "sqrt":         {"label": "Square Root",           "type": "numeric", "desc": "sqrt(x) — moderate skew fix"},
    "square":       {"label": "Square (x²)",           "type": "numeric", "desc": "x² — capture non-linear patterns"},
    "normalize":    {"label": "Normalize (0-1)",       "type": "numeric", "desc": "Scale values between 0 and 1"},
    "standardize":  {"label": "Standardize (Z-score)", "type": "numeric", "desc": "Mean=0, Std=1"},
    "binning":      {"label": "Binning (5 bins)",      "type": "numeric", "desc": "Convert numeric to 5 equal-width categories"},
    "abs":          {"label": "Absolute Value",        "type": "numeric", "desc": "Remove negative values"},
    "reciprocal":   {"label": "Reciprocal (1/x)",      "type": "numeric", "desc": "1/x transform"},

    # Categorical
    "label_encode": {"label": "Label Encoding",       "type": "categorical", "desc": "Convert text to numbers (A→0, B→1)"},
    "onehot":       {"label": "One-Hot Encoding",     "type": "categorical", "desc": "Create binary columns for each category"},
    "frequency":    {"label": "Frequency Encoding",   "type": "categorical", "desc": "Replace category with its frequency count"},

    # Date
    "extract_year":  {"label": "Extract Year",        "type": "datetime", "desc": "Get year from date column"},
    "extract_month": {"label": "Extract Month",       "type": "datetime", "desc": "Get month (1-12) from date column"},
    "extract_day":   {"label": "Extract Day",         "type": "datetime", "desc": "Get day of month from date column"},
    "extract_dow":   {"label": "Extract Day of Week", "type": "datetime", "desc": "0=Monday … 6=Sunday"},

    # Combined
    "add":      {"label": "Add Two Columns",      "type": "combine", "desc": "col_A + col_B"},
    "subtract": {"label": "Subtract Two Columns", "type": "combine", "desc": "col_A - col_B"},
    "multiply": {"label": "Multiply Two Columns", "type": "combine", "desc": "col_A × col_B"},
    "divide":   {"label": "Divide Two Columns",   "type": "combine", "desc": "col_A ÷ col_B"},

    # Missing values
    "fill_mean":   {"label": "Fill Missing → Mean",   "type": "missing", "desc": "Replace NaN with column mean"},
    "fill_median": {"label": "Fill Missing → Median", "type": "missing", "desc": "Replace NaN with column median"},
    "fill_mode":   {"label": "Fill Missing → Mode",   "type": "missing", "desc": "Replace NaN with most frequent value"},
    "fill_zero":   {"label": "Fill Missing → 0",      "type": "missing", "desc": "Replace NaN with 0"},
    "drop_rows":   {"label": "Drop Rows with NaN",    "type": "missing", "desc": "Remove rows that have missing values"},
}


def get_column_types(df: pd.DataFrame) -> dict:
    """Classify each column by its type with safe error handling."""
    result = {}
    try:
        for col in df.columns:
            try:
                if pd.api.types.is_datetime64_any_dtype(df[col]):
                    result[col] = "datetime"
                elif pd.api.types.is_numeric_dtype(df[col]):
                    result[col] = "numeric"
                else:
                    # Try parsing as datetime
                    try:
                        pd.to_datetime(df[col], errors='raise')
                        result[col] = "datetime"
                    except Exception:
                        result[col] = "categorical"
            except Exception as col_error:
                logger.warning(f"⚠️  Error classifying column '{col}': {str(col_error)}")
                result[col] = "unknown"

        logger.info(f"✓ Column types classified: {len(result)} columns")
        return result

    except Exception as e:
        logger.error(f"✗ Error in get_column_types: {str(e)}")
        return {}


def get_suggested_transforms(df: pd.DataFrame) -> list:
    """Auto-suggest transformations based on data analysis."""
    suggestions = []
    col_types = get_column_types(df)

    for col in df.columns:
        col_type = col_types.get(col, "categorical")
        missing_pct = df[col].isnull().mean() * 100

        # Missing value suggestions
        if missing_pct > 0:
            if col_type == "numeric":
                suggestions.append({
                    "col": col, "transform": "fill_median",
                    "reason": f"{missing_pct:.1f}% missing — fill with median",
                    "priority": "high" if missing_pct > 20 else "medium",
                })
            else:
                suggestions.append({
                    "col": col, "transform": "fill_mode",
                    "reason": f"{missing_pct:.1f}% missing — fill with mode",
                    "priority": "high" if missing_pct > 20 else "medium",
                })

        if col_type == "numeric":
            data = df[col].dropna()
            if len(data) == 0:
                continue

            # Skewness check
            skew = float(data.skew())
            if skew > 1.5:
                suggestions.append({
                    "col": col, "transform": "log",
                    "reason": f"High positive skew ({skew:.2f}) — log transform recommended",
                    "priority": "high",
                })
            elif skew > 0.8:
                suggestions.append({
                    "col": col, "transform": "sqrt",
                    "reason": f"Moderate skew ({skew:.2f}) — sqrt transform recommended",
                    "priority": "medium",
                })

            # Large range — normalize
            col_range = float(data.max() - data.min())
            if col_range > 1000:
                suggestions.append({
                    "col": col, "transform": "normalize",
                    "reason": f"Large range ({col_range:,.0f}) — normalize for ML",
                    "priority": "medium",
                })

        elif col_type == "categorical":
            n_unique = df[col].nunique()
            if n_unique <= 10:
                suggestions.append({
                    "col": col, "transform": "onehot",
                    "reason": f"{n_unique} unique values — one-hot encoding for ML",
                    "priority": "medium",
                })
            else:
                suggestions.append({
                    "col": col, "transform": "label_encode",
                    "reason": f"{n_unique} unique values — label encoding recommended",
                    "priority": "low",
                })

        elif col_type == "datetime":
            suggestions.append({
                "col": col, "transform": "extract_month",
                "reason": "Date column — extract month for seasonality analysis",
                "priority": "medium",
            })

    return suggestions


def apply_transformation(
    df: pd.DataFrame,
    col: str,
    transform: str,
    col2: Optional[str] = None,
    new_col_name: Optional[str] = None,
) -> tuple[pd.DataFrame, str, str]:
    """
    Apply a transformation to a column with comprehensive error handling.
    Returns: (modified_df, new_column_name, message)
    """
    df = df.copy()

    # Validate inputs
    if col not in df.columns:
        logger.warning(f"⚠️  Column '{col}' not found in dataframe")
        return df, "", f"Column '{col}' not found"

    if transform not in TRANSFORMATIONS:
        logger.warning(f"⚠️  Unknown transformation: {transform}")
        return df, "", f"Unknown transformation: {transform}"

    # Auto-generate new column name
    if not new_col_name:
        new_col_name = f"{col}_{transform}"
        if col2:
            new_col_name = f"{col}_{transform}_{col2}"

    try:
        # ── Numeric transforms ──
        if transform == "log":
            df[new_col_name] = np.log1p(df[col].clip(lower=0))
            msg = f"log(1 + {col}) → '{new_col_name}'"

        elif transform == "sqrt":
            df[new_col_name] = np.sqrt(df[col].clip(lower=0))
            msg = f"sqrt({col}) → '{new_col_name}'"

        elif transform == "square":
            df[new_col_name] = df[col] ** 2
            msg = f"{col}² → '{new_col_name}'"

        elif transform == "normalize":
            mn, mx = df[col].min(), df[col].max()
            if pd.isna(mn) or pd.isna(mx):
                return df, "", "Cannot normalize: column has no valid numeric values"
            df[new_col_name] = (df[col] - mn) / (mx - mn + 1e-9)
            msg = f"Normalized {col} to [0,1] → '{new_col_name}'"

        elif transform == "standardize":
            mean, std = df[col].mean(), df[col].std()
            if pd.isna(mean) or pd.isna(std):
                return df, "", "Cannot standardize: column has no valid numeric values"
            df[new_col_name] = (df[col] - mean) / (std + 1e-9)
            msg = f"Standardized {col} (mean=0, std=1) → '{new_col_name}'"

        elif transform == "abs":
            df[new_col_name] = df[col].abs()
            msg = f"|{col}| → '{new_col_name}'"

        elif transform == "reciprocal":
            df[new_col_name] = 1.0 / (df[col].replace(0, np.nan))
            msg = f"1/{col} → '{new_col_name}'"

        elif transform == "binning":
            df[new_col_name] = pd.cut(df[col], bins=5, labels=False)
            msg = f"{col} binned into 5 groups → '{new_col_name}'"

        # ── Categorical ──
        elif transform == "label_encode":
            from sklearn.preprocessing import LabelEncoder
            le = LabelEncoder()
            df[new_col_name] = le.fit_transform(df[col].astype(str))
            msg = f"Label encoded {col} → '{new_col_name}'"

        elif transform == "onehot":
            dummies = pd.get_dummies(df[col], prefix=col)
            df = pd.concat([df, dummies], axis=1)
            new_col_name = f"{col}_onehot (multiple columns)"
            msg = f"One-hot encoded {col} → {len(dummies.columns)} new columns"

        elif transform == "frequency":
            freq = df[col].value_counts()
            if len(freq) == 0:
                return df, "", "Cannot frequency encode: column has no valid values"
            df[new_col_name] = df[col].map(freq)
            msg = f"Frequency encoded {col} → '{new_col_name}'"

        # ── Datetime ──
        elif transform in ("extract_year", "extract_month", "extract_day", "extract_dow"):
            try:
                dt = pd.to_datetime(df[col], errors='coerce')
                part = transform.replace("extract_", "")
                attr_map = {"year": "year", "month": "month", "day": "day", "dow": "dayofweek"}
                if part not in attr_map:
                    return df, "", f"Invalid datetime part: {part}"
                df[new_col_name] = getattr(dt.dt, attr_map[part])
                msg = f"Extracted {part} from {col} → '{new_col_name}'"
            except Exception as e:
                logger.error(f"✗ Datetime extraction failed: {str(e)}")
                return df, "", f"Failed to extract {part} from date column: {str(e)}"

        # ── Combine ──
        elif transform in ("add", "subtract", "multiply", "divide"):
            if not col2 or col2 not in df.columns:
                logger.warning(f"⚠️  Second column '{col2}' not found")
                return df, "", f"Second column '{col2}' not found"
            ops = {"add": "+", "subtract": "-", "multiply": "×", "divide": "÷"}
            try:
                if transform == "add":
                    df[new_col_name] = df[col] + df[col2]
                elif transform == "subtract":
                    df[new_col_name] = df[col] - df[col2]
                elif transform == "multiply":
                    df[new_col_name] = df[col] * df[col2]
                elif transform == "divide":
                    df[new_col_name] = df[col] / df[col2].replace(0, np.nan)
                msg = f"{col} {ops[transform]} {col2} → '{new_col_name}'"
            except Exception as e:
                logger.error(f"✗ Combine operation failed: {str(e)}")
                return df, "", f"Failed to combine columns: {str(e)}"

        # ── Missing value fills ──
        elif transform == "fill_mean":
            if not pd.api.types.is_numeric_dtype(df[col]):
                return df, "", "Cannot fill mean: column is not numeric"
            mean_val = df[col].mean()
            if pd.isna(mean_val):
                return df, "", "Cannot fill mean: all values are NaN"
            df[col] = df[col].fillna(mean_val)
            new_col_name = col
            msg = f"Filled NaN in '{col}' with mean ({mean_val:.3f})"

        elif transform == "fill_median":
            if not pd.api.types.is_numeric_dtype(df[col]):
                return df, "", "Cannot fill median: column is not numeric"
            median_val = df[col].median()
            if pd.isna(median_val):
                return df, "", "Cannot fill median: all values are NaN"
            df[col] = df[col].fillna(median_val)
            new_col_name = col
            msg = f"Filled NaN in '{col}' with median ({median_val:.3f})"

        elif transform == "fill_mode":
            try:
                mode_val = df[col].mode()
                if len(mode_val) == 0:
                    return df, "", "Cannot fill mode: no valid values in column"
                df[col] = df[col].fillna(mode_val[0])
                new_col_name = col
                msg = f"Filled NaN in '{col}' with mode"
            except Exception as e:
                logger.error(f"✗ Mode fill failed: {str(e)}")
                return df, "", f"Failed to fill mode: {str(e)}"

        elif transform == "fill_zero":
            df[col] = df[col].fillna(0)
            new_col_name = col
            msg = f"Filled NaN in '{col}' with 0"

        elif transform == "drop_rows":
            before = len(df)
            df = df.dropna(subset=[col])
            dropped = before - len(df)
            new_col_name = col
            msg = f"Dropped {dropped} rows with NaN in '{col}'"

        else:
            logger.warning(f"⚠️  Unknown transformation: {transform}")
            return df, "", f"Unknown transformation: {transform}"

        logger.info(f"✓ Transformation applied: {transform} on {col} → {new_col_name}")
        return df, new_col_name, msg

    except Exception as e:
        logger.error(f"✗ Exception applying {transform} on {col}: {str(e)}")
        return df, "", f"Error applying {transform}: {str(e)}"


def get_column_stats(df: pd.DataFrame, col: str) -> dict:
    """Get before/after stats for a column with safe error handling."""
    try:
        if col not in df.columns:
            logger.warning(f"⚠️  Column '{col}' not found in dataframe")
            return {"col": col, "error": "Column not found", "dtype": str}

        stats = {
            "col": col,
            "dtype": str(df[col].dtype),
            "missing": int(df[col].isnull().sum()),
            "unique": int(df[col].nunique()),
        }

        if pd.api.types.is_numeric_dtype(df[col]):
            data = df[col].dropna()
            if len(data) > 0:
                stats.update({
                    "mean": round(float(data.mean()), 4),
                    "std": round(float(data.std()), 4),
                    "min": round(float(data.min()), 4),
                    "max": round(float(data.max()), 4),
                    "skew": round(float(data.skew()), 4),
                })
            else:
                stats.update({"mean": None, "std": None, "min": None, "max": None, "skew": None})

        logger.info(f"✓ Stats calculated for column: {col}")
        return stats

    except Exception as e:
        logger.error(f"✗ Error calculating stats for {col}: {str(e)}")
        return {"col": col, "error": str(e)}
