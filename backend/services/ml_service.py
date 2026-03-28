import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import os
import io
import json
import uuid
import joblib
import base64
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend for server
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Optional
from datetime import datetime

from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression, Ridge
from sklearn.svm import SVC, SVR
from sklearn.cluster import KMeans
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report,
    mean_squared_error, mean_absolute_error, r2_score,
    roc_curve, auc
)
from sklearn.feature_selection import SelectKBest, f_classif, f_regression

# Try importing xgboost (optional)
try:
    from xgboost import XGBClassifier, XGBRegressor
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False

MODELS_DIR = os.getenv("MODELS_DIR", "./models")
os.makedirs(MODELS_DIR, exist_ok=True)

# Matplotlib style
plt.style.use('dark_background')
ACCENT = '#86efac'
BG = '#1e1e16'
GRID = '#2a2a20'


def fig_to_base64(fig) -> str:
    """Convert matplotlib figure to base64 string."""
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight',
                facecolor=BG, edgecolor='none', dpi=120)
    buf.seek(0)
    img_b64 = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    return f"data:image/png;base64,{img_b64}"


def preprocess_for_ml(df: pd.DataFrame, target_col: str, feature_cols: list):
    """Preprocess dataframe for ML training."""
    df = df[feature_cols + [target_col]].copy()

    # Drop rows where target is null
    df = df.dropna(subset=[target_col])

    # Encode categorical columns
    encoders = {}
    for col in df.columns:
        if df[col].dtype == 'object':
            le = LabelEncoder()
            df[col] = df[col].astype(str)
            df[col] = le.fit_transform(df[col])
            encoders[col] = le

    # Fill remaining nulls with median
    df = df.fillna(df.median(numeric_only=True))

    X = df[feature_cols].values
    y = df[target_col].values

    return X, y, encoders


def get_algorithms(task_type: str) -> dict:
    """Return available algorithms for given task type."""
    if task_type == 'classification':
        algos = {
            'random_forest': RandomForestClassifier(n_estimators=100, random_state=42),
            'gradient_boosting': GradientBoostingClassifier(random_state=42),
            'logistic_regression': LogisticRegression(max_iter=1000, random_state=42),
            'svm': SVC(probability=True, random_state=42),
        }
        if XGBOOST_AVAILABLE:
            algos['xgboost'] = XGBClassifier(random_state=42, eval_metric='logloss', verbosity=0)
        return algos

    elif task_type == 'regression':
        algos = {
            'random_forest': RandomForestRegressor(n_estimators=100, random_state=42),
            'gradient_boosting': GradientBoostingRegressor(random_state=42),
            'linear_regression': LinearRegression(),
            'ridge': Ridge(random_state=42),
        }
        if XGBOOST_AVAILABLE:
            algos['xgboost'] = XGBRegressor(random_state=42, verbosity=0)
        return algos

    return {}


def train_model(
    df: pd.DataFrame,
    target_col: str,
    feature_cols: list,
    task_type: str,
    algorithm: str = 'random_forest',
    test_size: float = 0.2,
    auto_tune: bool = False,
) -> dict:
    """Train an ML model and return results with charts."""

    # Preprocess
    X, y, encoders = preprocess_for_ml(df, target_col, feature_cols)

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=test_size, random_state=42
    )

    # Get model
    algorithms = get_algorithms(task_type)
    if algorithm not in algorithms:
        algorithm = list(algorithms.keys())[0]
    model = algorithms[algorithm]

    # Auto-tune with GridSearchCV
    if auto_tune and task_type in ('classification', 'regression'):
        param_grids = {
            'random_forest': {'n_estimators': [50, 100, 200], 'max_depth': [None, 5, 10]},
            'gradient_boosting': {'n_estimators': [50, 100], 'learning_rate': [0.05, 0.1, 0.2]},
            'logistic_regression': {'C': [0.1, 1, 10]},
            'ridge': {'alpha': [0.1, 1.0, 10.0]},
        }
        if algorithm in param_grids:
            scoring = 'accuracy' if task_type == 'classification' else 'r2'
            grid = GridSearchCV(model, param_grids[algorithm], cv=3, scoring=scoring, n_jobs=-1)
            grid.fit(X_train, y_train)
            model = grid.best_estimator_

    # Train
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    # Cross-validation score
    cv_scores = cross_val_score(model, X_scaled, y, cv=5,
                                scoring='accuracy' if task_type == 'classification' else 'r2')

    # Metrics + charts
    metrics = {}
    charts = {}

    if task_type == 'classification':
        metrics = {
            'accuracy': round(float(accuracy_score(y_test, y_pred)), 4),
            'precision': round(float(precision_score(y_test, y_pred, average='weighted', zero_division=0)), 4),
            'recall': round(float(recall_score(y_test, y_pred, average='weighted', zero_division=0)), 4),
            'f1_score': round(float(f1_score(y_test, y_pred, average='weighted', zero_division=0)), 4),
            'cv_mean': round(float(cv_scores.mean()), 4),
            'cv_std': round(float(cv_scores.std()), 4),
        }
        charts['confusion_matrix'] = plot_confusion_matrix(y_test, y_pred)
        charts['metrics_bar'] = plot_metrics_bar(metrics)

        # ROC curve for binary classification
        if len(np.unique(y)) == 2 and hasattr(model, 'predict_proba'):
            charts['roc_curve'] = plot_roc_curve(model, X_test, y_test)

    elif task_type == 'regression':
        mse = mean_squared_error(y_test, y_pred)
        metrics = {
            'r2_score': round(float(r2_score(y_test, y_pred)), 4),
            'mae': round(float(mean_absolute_error(y_test, y_pred)), 4),
            'rmse': round(float(np.sqrt(mse)), 4),
            'mse': round(float(mse), 4),
            'cv_mean': round(float(cv_scores.mean()), 4),
            'cv_std': round(float(cv_scores.std()), 4),
        }
        charts['actual_vs_predicted'] = plot_actual_vs_predicted(y_test, y_pred)
        charts['residuals'] = plot_residuals(y_test, y_pred)

    elif task_type == 'clustering':
        from sklearn.metrics import silhouette_score
        n_clusters = int(algorithm.split('_')[-1]) if '_' in algorithm else 3
        model = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = model.fit_predict(X_scaled)
        sil_score = silhouette_score(X_scaled, labels) if len(np.unique(labels)) > 1 else 0
        metrics = {
            'n_clusters': n_clusters,
            'silhouette_score': round(float(sil_score), 4),
            'inertia': round(float(model.inertia_), 2),
        }
        charts['clusters'] = plot_clusters(X_scaled, labels, feature_cols)
        y_pred = labels

    # Feature importance chart
    if hasattr(model, 'feature_importances_'):
        charts['feature_importance'] = plot_feature_importance(
            model.feature_importances_, feature_cols
        )

    # Save model
    model_id = str(uuid.uuid4())
    model_path = os.path.join(MODELS_DIR, f"{model_id}.pkl")
    joblib.dump({'model': model, 'scaler': scaler, 'encoders': encoders,
                 'feature_cols': feature_cols, 'target_col': target_col,
                 'task_type': task_type}, model_path)

    return {
        'model_id': model_id,
        'algorithm': algorithm,
        'task_type': task_type,
        'target_col': target_col,
        'feature_cols': feature_cols,
        'train_size': len(X_train),
        'test_size': len(X_test),
        'metrics': metrics,
        'charts': charts,
        'auto_tuned': auto_tune,
        'trained_at': datetime.utcnow().isoformat(),
    }


def get_ai_suggestions(metrics: dict, task_type: str, algorithm: str, df_info: dict) -> list:
    """Generate improvement suggestions based on metrics."""
    suggestions = []

    if task_type == 'classification':
        acc = metrics.get('accuracy', 0)
        f1 = metrics.get('f1_score', 0)

        if acc < 0.7:
            suggestions.append("Accuracy is low (<70%). Try Gradient Boosting or XGBoost.")
        if acc > 0.99:
            suggestions.append("Accuracy is suspiciously high (>99%). Possible overfitting or data leakage.")
        if f1 < acc - 0.1:
            suggestions.append("F1 score is much lower than accuracy — your data may be imbalanced. Try class_weight='balanced'.")
        if algorithm == 'logistic_regression' and acc < 0.8:
            suggestions.append("Logistic Regression may be underfitting. Try Random Forest or Gradient Boosting.")
        if metrics.get('cv_std', 0) > 0.05:
            suggestions.append("High CV std deviation — model is unstable. Try more data or simpler model.")

    elif task_type == 'regression':
        r2 = metrics.get('r2_score', 0)
        if r2 < 0.5:
            suggestions.append("R² is low (<0.5). Try feature engineering or Gradient Boosting.")
        if r2 < 0:
            suggestions.append("Negative R² — model is worse than baseline. Check your features and target column.")
        if r2 > 0.99:
            suggestions.append("R² is very high (>0.99). Possible data leakage — check if target column is in features.")
        if algorithm == 'linear_regression' and r2 < 0.7:
            suggestions.append("Linear Regression underfitting. Try Random Forest Regressor.")

    if df_info.get('missing_pct', 0) > 10:
        suggestions.append(f"Dataset has {df_info['missing_pct']:.1f}% missing values. Better imputation could improve results.")

    if not suggestions:
        suggestions.append("Model looks good! Try 'Auto Tune' for hyperparameter optimization to squeeze out more performance.")

    return suggestions


# ── Chart Functions ────────────────────────────────────────────────

def plot_confusion_matrix(y_test, y_pred) -> str:
    cm = confusion_matrix(y_test, y_pred)
    fig, ax = plt.subplots(figsize=(6, 5))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)
    sns.heatmap(cm, annot=True, fmt='d', cmap='Greens', ax=ax,
                linewidths=0.5, linecolor=GRID,
                annot_kws={'size': 12, 'weight': 'bold'})
    ax.set_xlabel('Predicted', color='#a0a090', fontsize=11)
    ax.set_ylabel('Actual', color='#a0a090', fontsize=11)
    ax.set_title('Confusion Matrix', color=ACCENT, fontsize=13, pad=12)
    ax.tick_params(colors='#a0a090')
    plt.tight_layout()
    return fig_to_base64(fig)


def plot_metrics_bar(metrics: dict) -> str:
    keys = ['accuracy', 'precision', 'recall', 'f1_score']
    vals = [metrics.get(k, 0) for k in keys]
    labels = ['Accuracy', 'Precision', 'Recall', 'F1 Score']

    fig, ax = plt.subplots(figsize=(7, 4))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)

    colors = [ACCENT if v >= 0.8 else '#fbbf24' if v >= 0.6 else '#f87171' for v in vals]
    bars = ax.bar(labels, vals, color=colors, width=0.5, edgecolor=BG, linewidth=1.5)

    for bar, val in zip(bars, vals):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.01,
                f'{val:.2%}', ha='center', va='bottom', color='white', fontsize=11, fontweight='bold')

    ax.set_ylim(0, 1.12)
    ax.set_title('Model Performance Metrics', color=ACCENT, fontsize=13, pad=12)
    ax.tick_params(colors='#a0a090')
    ax.set_facecolor(BG)
    ax.spines[:].set_color(GRID)
    ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, _: f'{x:.0%}'))
    ax.grid(axis='y', color=GRID, linewidth=0.5)
    plt.tight_layout()
    return fig_to_base64(fig)


def plot_feature_importance(importances, feature_names: list) -> str:
    indices = np.argsort(importances)[::-1]
    top_n = min(15, len(feature_names))
    indices = indices[:top_n]

    fig, ax = plt.subplots(figsize=(7, max(4, top_n * 0.4)))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)

    colors = [ACCENT] * top_n
    bars = ax.barh(
        [feature_names[i] for i in indices[::-1]],
        importances[indices[::-1]],
        color=colors, edgecolor=BG
    )
    ax.set_xlabel('Importance', color='#a0a090')
    ax.set_title('Feature Importance', color=ACCENT, fontsize=13, pad=12)
    ax.tick_params(colors='#a0a090')
    ax.spines[:].set_color(GRID)
    ax.grid(axis='x', color=GRID, linewidth=0.5)
    plt.tight_layout()
    return fig_to_base64(fig)


def plot_actual_vs_predicted(y_test, y_pred) -> str:
    fig, ax = plt.subplots(figsize=(6, 5))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)

    ax.scatter(y_test, y_pred, alpha=0.6, color=ACCENT, s=30, edgecolors='none')
    mn, mx = min(y_test.min(), y_pred.min()), max(y_test.max(), y_pred.max())
    ax.plot([mn, mx], [mn, mx], 'r--', linewidth=1.5, label='Perfect Prediction')

    ax.set_xlabel('Actual', color='#a0a090')
    ax.set_ylabel('Predicted', color='#a0a090')
    ax.set_title('Actual vs Predicted', color=ACCENT, fontsize=13, pad=12)
    ax.tick_params(colors='#a0a090')
    ax.spines[:].set_color(GRID)
    ax.legend(facecolor=BG, edgecolor=GRID, labelcolor='white')
    plt.tight_layout()
    return fig_to_base64(fig)


def plot_residuals(y_test, y_pred) -> str:
    residuals = y_test - y_pred
    fig, ax = plt.subplots(figsize=(6, 4))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)

    ax.scatter(y_pred, residuals, alpha=0.6, color=ACCENT, s=25, edgecolors='none')
    ax.axhline(0, color='#f87171', linewidth=1.5, linestyle='--')
    ax.set_xlabel('Predicted', color='#a0a090')
    ax.set_ylabel('Residuals', color='#a0a090')
    ax.set_title('Residual Plot', color=ACCENT, fontsize=13, pad=12)
    ax.tick_params(colors='#a0a090')
    ax.spines[:].set_color(GRID)
    ax.grid(color=GRID, linewidth=0.4)
    plt.tight_layout()
    return fig_to_base64(fig)


def plot_roc_curve(model, X_test, y_test) -> str:
    y_prob = model.predict_proba(X_test)[:, 1]
    fpr, tpr, _ = roc_curve(y_test, y_prob)
    roc_auc = auc(fpr, tpr)

    fig, ax = plt.subplots(figsize=(6, 5))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)

    ax.plot(fpr, tpr, color=ACCENT, linewidth=2, label=f'AUC = {roc_auc:.3f}')
    ax.plot([0, 1], [0, 1], 'r--', linewidth=1)
    ax.set_xlabel('False Positive Rate', color='#a0a090')
    ax.set_ylabel('True Positive Rate', color='#a0a090')
    ax.set_title('ROC Curve', color=ACCENT, fontsize=13, pad=12)
    ax.tick_params(colors='#a0a090')
    ax.spines[:].set_color(GRID)
    ax.legend(facecolor=BG, edgecolor=GRID, labelcolor='white')
    plt.tight_layout()
    return fig_to_base64(fig)


def plot_clusters(X_scaled, labels, feature_cols: list) -> str:
    fig, ax = plt.subplots(figsize=(7, 5))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)

    colors = plt.cm.Set2(np.linspace(0, 1, len(np.unique(labels))))
    for i, label in enumerate(np.unique(labels)):
        mask = labels == label
        ax.scatter(X_scaled[mask, 0], X_scaled[mask, 1] if X_scaled.shape[1] > 1 else [0] * mask.sum(),
                   color=colors[i], label=f'Cluster {label}', alpha=0.7, s=30)

    ax.set_xlabel(feature_cols[0] if feature_cols else 'Feature 1', color='#a0a090')
    ax.set_ylabel(feature_cols[1] if len(feature_cols) > 1 else 'Feature 2', color='#a0a090')
    ax.set_title('Cluster Visualization', color=ACCENT, fontsize=13, pad=12)
    ax.tick_params(colors='#a0a090')
    ax.spines[:].set_color(GRID)
    ax.legend(facecolor=BG, edgecolor=GRID, labelcolor='white')
    plt.tight_layout()
    return fig_to_base64(fig)


def generate_eda_charts(df: pd.DataFrame) -> dict:
    """Generate exploratory data analysis charts."""
    charts = {}
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=['object']).columns.tolist()

    # Correlation heatmap
    if len(numeric_cols) >= 2:
        corr = df[numeric_cols[:12]].corr()
        fig, ax = plt.subplots(figsize=(max(6, len(corr) * 0.8), max(5, len(corr) * 0.7)))
        fig.patch.set_facecolor(BG)
        ax.set_facecolor(BG)
        mask = np.triu(np.ones_like(corr, dtype=bool))
        sns.heatmap(corr, mask=mask, annot=len(corr) <= 8, fmt='.2f',
                    cmap='RdYlGn', ax=ax, linewidths=0.3, linecolor=GRID,
                    annot_kws={'size': 9})
        ax.set_title('Correlation Heatmap', color=ACCENT, fontsize=13, pad=12)
        ax.tick_params(colors='#a0a090', rotation=45)
        plt.tight_layout()
        charts['correlation'] = fig_to_base64(fig)

    # Distribution plots (first 6 numeric cols)
    if numeric_cols:
        cols_to_plot = numeric_cols[:6]
        n = len(cols_to_plot)
        ncols = min(3, n)
        nrows = (n + ncols - 1) // ncols
        fig, axes = plt.subplots(nrows, ncols, figsize=(5 * ncols, 3.5 * nrows))
        fig.patch.set_facecolor(BG)
        axes = np.array(axes).flatten() if n > 1 else [axes]

        for i, col in enumerate(cols_to_plot):
            ax = axes[i]
            ax.set_facecolor(BG)
            data = df[col].dropna()
            ax.hist(data, bins=30, color=ACCENT, alpha=0.8, edgecolor=BG)
            ax.axvline(data.mean(), color='#f87171', linestyle='--', linewidth=1.5, label=f'Mean: {data.mean():.2f}')
            ax.set_title(col, color='#a0a090', fontsize=10)
            ax.tick_params(colors='#606058', labelsize=8)
            ax.spines[:].set_color(GRID)
            ax.grid(color=GRID, linewidth=0.3)

        for j in range(i + 1, len(axes)):
            axes[j].set_visible(False)

        plt.suptitle('Feature Distributions', color=ACCENT, fontsize=13, y=1.01)
        plt.tight_layout()
        charts['distributions'] = fig_to_base64(fig)

    # Top categorical bar charts (first 3)
    if categorical_cols:
        cols_to_plot = categorical_cols[:3]
        n = len(cols_to_plot)
        fig, axes = plt.subplots(1, n, figsize=(5 * n, 4))
        fig.patch.set_facecolor(BG)
        axes = [axes] if n == 1 else axes

        for i, col in enumerate(cols_to_plot):
            ax = axes[i]
            ax.set_facecolor(BG)
            vc = df[col].value_counts().head(10)
            bars = ax.bar(range(len(vc)), vc.values, color=ACCENT, edgecolor=BG)
            ax.set_xticks(range(len(vc)))
            ax.set_xticklabels(vc.index, rotation=45, ha='right', fontsize=8, color='#a0a090')
            ax.set_title(col, color='#a0a090', fontsize=10)
            ax.tick_params(colors='#606058')
            ax.spines[:].set_color(GRID)
            ax.grid(axis='y', color=GRID, linewidth=0.3)

        plt.suptitle('Categorical Distributions', color=ACCENT, fontsize=13, y=1.01)
        plt.tight_layout()
        charts['categorical'] = fig_to_base64(fig)

    # Missing values chart
    missing = df.isnull().sum()
    missing = missing[missing > 0].sort_values(ascending=False)
    if not missing.empty:
        fig, ax = plt.subplots(figsize=(7, max(3, len(missing) * 0.4)))
        fig.patch.set_facecolor(BG)
        ax.set_facecolor(BG)
        pct = (missing / len(df) * 100)
        colors = ['#f87171' if p > 30 else '#fbbf24' if p > 10 else ACCENT for p in pct]
        ax.barh(missing.index, pct.values, color=colors, edgecolor=BG)
        ax.set_xlabel('Missing %', color='#a0a090')
        ax.set_title('Missing Values', color=ACCENT, fontsize=13, pad=12)
        ax.tick_params(colors='#a0a090')
        ax.spines[:].set_color(GRID)
        ax.grid(axis='x', color=GRID, linewidth=0.4)
        plt.tight_layout()
        charts['missing'] = fig_to_base64(fig)

    return charts


def generate_learning_curve(
    df,
    target_col: str,
    feature_cols: list,
    task_type: str,
    algorithm: str = 'random_forest',
) -> str:
    """Generate learning curve chart and return as base64."""
    from sklearn.model_selection import learning_curve as sk_learning_curve
    import numpy as np

    X, y, _ = preprocess_for_ml(df, target_col, feature_cols)
    scaler  = StandardScaler()
    X_scaled= scaler.fit_transform(X)

    algorithms = get_algorithms(task_type)
    model = algorithms.get(algorithm, list(algorithms.values())[0])
    scoring = 'accuracy' if task_type == 'classification' else 'r2'

    train_sizes = np.linspace(0.1, 1.0, 10)
    train_sizes_abs, train_scores, val_scores = sk_learning_curve(
        model, X_scaled, y,
        train_sizes=train_sizes,
        cv=5, scoring=scoring, n_jobs=-1,
        error_score=0.0,          # dont crash on bad splits
    )

    # Replace NaN/Inf with 0 before any computation
    train_scores = np.nan_to_num(train_scores, nan=0.0, posinf=1.0, neginf=0.0)
    val_scores   = np.nan_to_num(val_scores,   nan=0.0, posinf=1.0, neginf=0.0)

    train_mean = train_scores.mean(axis=1)
    train_std  = train_scores.std(axis=1)
    val_mean   = val_scores.mean(axis=1)
    val_std    = val_scores.std(axis=1)

    fig, ax = plt.subplots(figsize=(8, 5))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)

    # Fill std bands
    ax.fill_between(train_sizes_abs,
                    train_mean - train_std, train_mean + train_std,
                    alpha=0.12, color=ACCENT)
    ax.fill_between(train_sizes_abs,
                    val_mean - val_std, val_mean + val_std,
                    alpha=0.12, color='#fbbf24')

    # Main lines
    ax.plot(train_sizes_abs, train_mean, 'o-', color=ACCENT,
            linewidth=2.5, markersize=5, label='Training Score')
    ax.plot(train_sizes_abs, val_mean, 's--', color='#fbbf24',
            linewidth=2.5, markersize=5, label='Validation Score')

    # Gap annotation
    final_gap = train_mean[-1] - val_mean[-1]
    if final_gap > 0.15:
        ax.annotate('⚠ High variance\n(Overfitting)',
                    xy=(train_sizes_abs[-1], (train_mean[-1] + val_mean[-1]) / 2),
                    xytext=(-120, 0), textcoords='offset points',
                    fontsize=9, color='#f87171',
                    arrowprops=dict(arrowstyle='->', color='#f87171'))
    elif val_mean[-1] < 0.6:
        ax.annotate('⚠ High bias\n(Underfitting)',
                    xy=(train_sizes_abs[-1], val_mean[-1]),
                    xytext=(-120, -30), textcoords='offset points',
                    fontsize=9, color='#fbbf24',
                    arrowprops=dict(arrowstyle='->', color='#fbbf24'))

    ax.set_xlabel('Training Examples', color='#a0a090', fontsize=11)
    ax.set_ylabel(scoring.title(), color='#a0a090', fontsize=11)
    ax.set_title(f'Learning Curve — {algorithm.replace("_"," ").title()}',
                 color=ACCENT, fontsize=13, pad=14)
    ax.tick_params(colors='#606058')
    ax.spines[:].set_color(GRID)
    ax.grid(color=GRID, linewidth=0.4)
    ax.legend(facecolor=BG, edgecolor=GRID, labelcolor='white', fontsize=10)
    ax.set_ylim(max(0, min(train_mean.min(), val_mean.min()) - 0.08), 1.05)

    plt.tight_layout()

    # Diagnosis
    gap  = float(train_mean[-1] - val_mean[-1])
    diag = (
        'overfitting' if gap > 0.15 else
        'underfitting' if val_mean[-1] < 0.6 else
        'good_fit'
    )

    chart_b64 = fig_to_base64(fig)

    def safe_list(arr):
        return [round(float(np.nan_to_num(v, nan=0.0, posinf=1.0, neginf=0.0)), 4) for v in arr]

    return {
        'chart':          chart_b64,
        'train_scores':   safe_list(train_mean),
        'val_scores':     safe_list(val_mean),
        'train_sizes':    [int(x) for x in train_sizes_abs.tolist()],
        'final_train':    round(float(np.nan_to_num(train_mean[-1], nan=0.0)), 4),
        'final_val':      round(float(np.nan_to_num(val_mean[-1],   nan=0.0)), 4),
        'gap':            round(float(np.nan_to_num(gap,             nan=0.0)), 4),
        'diagnosis':      diag,
    }
