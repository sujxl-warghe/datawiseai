import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import io
import os
from datetime import datetime
from typing import Optional

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, Image
)
from reportlab.platypus.flowables import Flowable

# ── Color Palette ──────────────────────────────────────────────────
C_GREEN      = colors.HexColor('#16a34a')
C_GREEN_LIGHT= colors.HexColor('#86efac')
C_BG         = colors.HexColor('#f0fdf4')
C_DARK       = colors.HexColor('#0f172a')
C_GRAY       = colors.HexColor('#64748b')
C_LGRAY      = colors.HexColor('#e2e8f0')
C_WHITE      = colors.white
C_AMBER      = colors.HexColor('#f59e0b')
C_RED        = colors.HexColor('#ef4444')


# ── Custom Flowables ───────────────────────────────────────────────

class ColoredBox(Flowable):
    """A colored rounded rectangle used as section background."""
    def __init__(self, width, height, color, radius=6):
        super().__init__()
        self.width  = width
        self.height = height
        self.color  = color
        self.radius = radius

    def draw(self):
        self.canv.setFillColor(self.color)
        self.canv.roundRect(0, 0, self.width, self.height, self.radius, fill=1, stroke=0)


# ── Styles ─────────────────────────────────────────────────────────

def get_styles():
    base = getSampleStyleSheet()
    return {
        'title': ParagraphStyle('title',
            fontSize=26, fontName='Helvetica-Bold',
            textColor=C_DARK, spaceAfter=4, alignment=TA_LEFT),
        'subtitle': ParagraphStyle('subtitle',
            fontSize=12, fontName='Helvetica',
            textColor=C_GRAY, spaceAfter=16, alignment=TA_LEFT),
        'h2': ParagraphStyle('h2',
            fontSize=14, fontName='Helvetica-Bold',
            textColor=C_DARK, spaceBefore=18, spaceAfter=8),
        'h3': ParagraphStyle('h3',
            fontSize=11, fontName='Helvetica-Bold',
            textColor=C_DARK, spaceBefore=10, spaceAfter=6),
        'body': ParagraphStyle('body',
            fontSize=10, fontName='Helvetica',
            textColor=C_DARK, spaceAfter=6, leading=16),
        'small': ParagraphStyle('small',
            fontSize=8.5, fontName='Helvetica',
            textColor=C_GRAY, spaceAfter=4),
        'mono': ParagraphStyle('mono',
            fontSize=9, fontName='Courier',
            textColor=C_DARK, spaceAfter=4, backColor=C_LGRAY),
        'badge': ParagraphStyle('badge',
            fontSize=9, fontName='Helvetica-Bold',
            textColor=C_GREEN, alignment=TA_CENTER),
        'footer': ParagraphStyle('footer',
            fontSize=8, fontName='Helvetica',
            textColor=C_GRAY, alignment=TA_CENTER),
    }


# ── Helper: DataFrame stats table ─────────────────────────────────

def df_stats_table(df: pd.DataFrame, styles) -> Table:
    numeric_cols = df.select_dtypes(include=np.number).columns.tolist()
    if not numeric_cols:
        return Paragraph("No numeric columns found.", styles['body'])

    cols = numeric_cols[:8]
    header = ['Column', 'Count', 'Mean', 'Std', 'Min', 'Max', 'Missing', 'Skew']
    rows   = [header]

    for c in cols:
        s    = df[c].describe()
        miss = int(df[c].isnull().sum())
        skew = round(float(df[c].skew()), 3) if len(df[c].dropna()) > 1 else 'N/A'
        rows.append([
            c[:22],
            int(s.get('count', 0)),
            f"{s.get('mean', 0):.3f}",
            f"{s.get('std',  0):.3f}",
            f"{s.get('min',  0):.3f}",
            f"{s.get('max',  0):.3f}",
            miss,
            skew,
        ])

    col_widths = [4.5*cm, 1.6*cm, 2*cm, 2*cm, 2*cm, 2*cm, 1.8*cm, 1.8*cm]
    t = Table(rows, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        # Header
        ('BACKGROUND',  (0,0), (-1,0), C_GREEN),
        ('TEXTCOLOR',   (0,0), (-1,0), C_WHITE),
        ('FONTNAME',    (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',    (0,0), (-1,0), 9),
        ('ALIGN',       (0,0), (-1,0), 'CENTER'),
        # Body
        ('FONTSIZE',    (0,1), (-1,-1), 9),
        ('FONTNAME',    (0,1), (-1,-1), 'Helvetica'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [C_WHITE, C_BG]),
        ('ALIGN',       (1,1), (-1,-1), 'CENTER'),
        ('ALIGN',       (0,1), (0,-1), 'LEFT'),
        # Grid
        ('GRID',        (0,0), (-1,-1), 0.4, C_LGRAY),
        ('ROUNDEDCORNERS', [4]),
        ('TOPPADDING',  (0,0), (-1,-1), 5),
        ('BOTTOMPADDING',(0,0),(-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
    ]))
    return t


# ── Helper: Metrics table ──────────────────────────────────────────

def metrics_table(metrics: dict, task_type: str) -> Table:
    if task_type == 'classification':
        items = [
            ('Accuracy',  metrics.get('accuracy')),
            ('Precision', metrics.get('precision')),
            ('Recall',    metrics.get('recall')),
            ('F1 Score',  metrics.get('f1_score')),
            ('CV Mean',   metrics.get('cv_mean')),
        ]
    elif task_type == 'regression':
        items = [
            ('R² Score',  metrics.get('r2_score')),
            ('MAE',       metrics.get('mae')),
            ('RMSE',      metrics.get('rmse')),
            ('CV Mean',   metrics.get('cv_mean')),
        ]
    else:
        items = [
            ('Clusters',         metrics.get('n_clusters')),
            ('Silhouette Score', metrics.get('silhouette_score')),
            ('Inertia',          metrics.get('inertia')),
        ]

    rows = [['Metric', 'Value', 'Rating']]
    for name, val in items:
        if val is None:
            continue
        is_pct = name in ('Accuracy','Precision','Recall','F1 Score','CV Mean','R² Score','Silhouette Score')
        display = f"{val*100:.2f}%" if is_pct else f"{val:.4f}"

        # Rating
        if is_pct:
            rating = '🟢 Excellent' if val >= 0.85 else '🟡 Good' if val >= 0.70 else '🔴 Needs Work'
        else:
            rating = '—'

        rows.append([name, display, rating])

    t = Table(rows, colWidths=[5*cm, 4*cm, 5*cm], repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND',  (0,0), (-1,0), C_DARK),
        ('TEXTCOLOR',   (0,0), (-1,0), C_WHITE),
        ('FONTNAME',    (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',    (0,0), (-1,-1), 10),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [C_WHITE, C_BG]),
        ('ALIGN',       (1,0), (-1,-1), 'CENTER'),
        ('ALIGN',       (0,0), (0,-1), 'LEFT'),
        ('GRID',        (0,0), (-1,-1), 0.4, C_LGRAY),
        ('TOPPADDING',  (0,0), (-1,-1), 7),
        ('BOTTOMPADDING',(0,0),(-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))
    return t


# ── Helper: base64 chart → ReportLab Image ────────────────────────

def b64_to_image(b64_str: str, width=16*cm, height=10*cm) -> Optional[Image]:
    if not b64_str:
        return None
    try:
        import base64
        data = b64_str.split(',', 1)[-1]
        buf  = io.BytesIO(base64.b64decode(data))
        img  = Image(buf, width=width, height=height)
        img.hAlign = 'CENTER'
        return img
    except Exception:
        return None


# ── Main Report Generator ──────────────────────────────────────────

def generate_report(
    filename:   str,
    df:         pd.DataFrame,
    ml_result:  Optional[dict] = None,
    fe_steps:   Optional[list] = None,
    eda_charts: Optional[dict] = None,
    project_title: str = "Data Analysis Report",
    student_name:  str = "",
    institution:   str = "",
) -> bytes:
    """Generate a full PDF report and return as bytes."""

    buf    = io.BytesIO()
    W, H   = A4
    margin = 2 * cm
    doc    = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=margin, rightMargin=margin,
        topMargin=margin,  bottomMargin=margin,
        title=project_title,
    )

    S     = get_styles()
    story = []
    now   = datetime.now().strftime("%B %d, %Y  %H:%M")

    # ── Cover Page ─────────────────────────────────────────────────
    story.append(Spacer(1, 1.5*cm))

    # Green accent bar
    story.append(HRFlowable(width='100%', thickness=4, color=C_GREEN, spaceAfter=20))

    story.append(Paragraph(project_title, S['title']))
    story.append(Paragraph(f"Dataset: <b>{filename}</b>", S['subtitle']))

    if student_name:
        story.append(Paragraph(f"Prepared by: {student_name}", S['body']))
    if institution:
        story.append(Paragraph(f"Institution: {institution}", S['body']))

    story.append(Paragraph(f"Generated: {now}", S['small']))
    story.append(HRFlowable(width='100%', thickness=1, color=C_LGRAY, spaceBefore=16, spaceAfter=16))

    # Summary badges
    badge_data = [[
        f"{len(df):,}\nRows",
        f"{len(df.columns)}\nColumns",
        f"{int(df.isnull().sum().sum())}\nMissing",
        f"{len(df.select_dtypes(include=np.number).columns)}\nNumeric",
        f"{len(df.select_dtypes(include='object').columns)}\nCategorical",
    ]]
    bt = Table(badge_data, colWidths=[3.2*cm]*5)
    bt.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,-1), C_BG),
        ('TEXTCOLOR',     (0,0), (-1,-1), C_DARK),
        ('FONTNAME',      (0,0), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE',      (0,0), (-1,-1), 11),
        ('ALIGN',         (0,0), (-1,-1), 'CENTER'),
        ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING',    (0,0), (-1,-1), 12),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
        ('ROUNDEDCORNERS',[6]),
        ('BOX',           (0,0), (-1,-1), 1, C_GREEN_LIGHT),
        ('INNERGRID',     (0,0), (-1,-1), 0.5, C_LGRAY),
    ]))
    story.append(bt)
    story.append(Spacer(1, 0.5*cm))

    # ── 1. Dataset Overview ────────────────────────────────────────
    story.append(Paragraph("1. Dataset Overview", S['h2']))
    story.append(HRFlowable(width='100%', thickness=1, color=C_LGRAY, spaceAfter=8))

    # Column list table
    col_rows = [['#', 'Column Name', 'Data Type', 'Non-Null', 'Unique', 'Missing %']]
    for i, col in enumerate(df.columns[:25], 1):
        dtype    = str(df[col].dtype)
        non_null = int(df[col].count())
        unique   = int(df[col].nunique())
        miss_pct = f"{df[col].isnull().mean()*100:.1f}%"
        col_rows.append([i, col[:28], dtype, non_null, unique, miss_pct])

    if len(df.columns) > 25:
        col_rows.append(['...', f"+ {len(df.columns)-25} more columns", '', '', '', ''])

    ct = Table(col_rows, colWidths=[1*cm, 5.5*cm, 2.5*cm, 2*cm, 2*cm, 2*cm], repeatRows=1)
    ct.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,0), C_DARK),
        ('TEXTCOLOR',     (0,0), (-1,0), C_WHITE),
        ('FONTNAME',      (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',      (0,0), (-1,-1), 9),
        ('ROWBACKGROUNDS',(0,1), (-1,-1), [C_WHITE, C_BG]),
        ('GRID',          (0,0), (-1,-1), 0.3, C_LGRAY),
        ('ALIGN',         (0,0), (-1,-1), 'CENTER'),
        ('ALIGN',         (1,0), (1,-1), 'LEFT'),
        ('TOPPADDING',    (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING',   (0,0), (-1,-1), 6),
    ]))
    story.append(ct)

    # ── 2. Descriptive Statistics ──────────────────────────────────
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph("2. Descriptive Statistics", S['h2']))
    story.append(HRFlowable(width='100%', thickness=1, color=C_LGRAY, spaceAfter=8))
    story.append(df_stats_table(df, S))

    # ── 3. EDA Charts ──────────────────────────────────────────────
    if eda_charts:
        story.append(PageBreak())
        story.append(Paragraph("3. Exploratory Data Analysis", S['h2']))
        story.append(HRFlowable(width='100%', thickness=1, color=C_LGRAY, spaceAfter=8))

        CHART_TITLES = {
            'correlation':   'Correlation Heatmap',
            'distributions': 'Feature Distributions',
            'categorical':   'Categorical Distributions',
            'missing':       'Missing Values Overview',
        }

        for key, b64 in eda_charts.items():
            img = b64_to_image(b64, width=16*cm, height=9*cm)
            if img:
                story.append(Paragraph(CHART_TITLES.get(key, key.title()), S['h3']))
                story.append(img)
                story.append(Spacer(1, 0.4*cm))

    # ── 4. Feature Engineering ─────────────────────────────────────
    if fe_steps and len(fe_steps) > 0:
        story.append(PageBreak())
        story.append(Paragraph("4. Feature Engineering", S['h2']))
        story.append(HRFlowable(width='100%', thickness=1, color=C_LGRAY, spaceAfter=8))
        story.append(Paragraph(
            f"A total of <b>{len(fe_steps)}</b> transformations were applied to prepare the dataset for modeling.",
            S['body']
        ))
        story.append(Spacer(1, 0.3*cm))

        fe_rows = [['#', 'Column', 'Transformation', 'Result']]
        for i, step in enumerate(fe_steps, 1):
            fe_rows.append([
                i,
                step.get('col', '')[:20],
                step.get('transform', '').replace('_', ' ').title(),
                step.get('msg', '')[:45],
            ])

        ft = Table(fe_rows, colWidths=[1*cm, 3.5*cm, 3.5*cm, 7*cm], repeatRows=1)
        ft.setStyle(TableStyle([
            ('BACKGROUND',    (0,0), (-1,0), C_GREEN),
            ('TEXTCOLOR',     (0,0), (-1,0), C_WHITE),
            ('FONTNAME',      (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE',      (0,0), (-1,-1), 9),
            ('ROWBACKGROUNDS',(0,1), (-1,-1), [C_WHITE, C_BG]),
            ('GRID',          (0,0), (-1,-1), 0.3, C_LGRAY),
            ('ALIGN',         (0,0), (0,-1), 'CENTER'),
            ('TOPPADDING',    (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING',   (0,0), (-1,-1), 6),
        ]))
        story.append(ft)

    # ── 5. ML Model Results ────────────────────────────────────────
    if ml_result:
        story.append(PageBreak())
        section_num = 5 if (fe_steps and eda_charts) else 4
        story.append(Paragraph(f"{section_num}. Machine Learning Results", S['h2']))
        story.append(HRFlowable(width='100%', thickness=1, color=C_LGRAY, spaceAfter=8))

        algo  = (ml_result.get('algorithm') or '').replace('_', ' ').title()
        ttype = ml_result.get('task_type', 'classification')
        story.append(Paragraph(
            f"Algorithm: <b>{algo}</b>  |  Task: <b>{ttype.title()}</b>  |  "
            f"Target: <b>{ml_result.get('target_col', 'N/A')}</b>",
            S['body']
        ))
        story.append(Spacer(1, 0.3*cm))

        if ml_result.get('metrics'):
            story.append(Paragraph("Model Performance Metrics", S['h3']))
            story.append(metrics_table(ml_result['metrics'], ttype))
            story.append(Spacer(1, 0.4*cm))

        # Feature cols used
        feat_cols = ml_result.get('feature_cols', [])
        if feat_cols:
            story.append(Paragraph("Features Used", S['h3']))
            story.append(Paragraph(
                ', '.join(feat_cols[:20]) + (f' (+{len(feat_cols)-20} more)' if len(feat_cols) > 20 else ''),
                S['body']
            ))

        # ML charts
        charts = ml_result.get('charts') or {}
        CHART_TITLES = {
            'confusion_matrix':    'Confusion Matrix',
            'metrics_bar':         'Performance Metrics',
            'feature_importance':  'Feature Importance',
            'roc_curve':           'ROC Curve',
            'actual_vs_predicted': 'Actual vs Predicted',
            'residuals':           'Residual Plot',
        }
        if charts:
            story.append(Spacer(1, 0.3*cm))
            story.append(Paragraph("Model Visualizations", S['h3']))
            chart_items = list(charts.items())
            for i in range(0, len(chart_items), 2):
                row_imgs = []
                for key, b64 in chart_items[i:i+2]:
                    img = b64_to_image(b64, width=8.5*cm, height=6.5*cm)
                    if img:
                        cell = [Paragraph(CHART_TITLES.get(key, key), S['small']), img]
                        row_imgs.append(cell)
                if row_imgs:
                    if len(row_imgs) == 1:
                        row_imgs.append([''])
                    ct2 = Table([row_imgs], colWidths=[9*cm, 9*cm])
                    ct2.setStyle(TableStyle([
                        ('VALIGN', (0,0), (-1,-1), 'TOP'),
                        ('ALIGN',  (0,0), (-1,-1), 'CENTER'),
                    ]))
                    story.append(ct2)
                    story.append(Spacer(1, 0.3*cm))

        # Suggestions
        suggestions = ml_result.get('suggestions', [])
        if suggestions:
            story.append(Paragraph("AI Improvement Suggestions", S['h3']))
            for s in suggestions:
                story.append(Paragraph(f"→ {s}", S['body']))

    # ── 6. Conclusion ──────────────────────────────────────────────
    story.append(Spacer(1, 0.5*cm))
    story.append(HRFlowable(width='100%', thickness=1, color=C_LGRAY))
    story.append(Spacer(1, 0.3*cm))

    conclusion_parts = [
        f"This report analyzed the dataset <b>{filename}</b> containing "
        f"<b>{len(df):,} rows</b> and <b>{len(df.columns)} columns</b>.",
    ]
    if int(df.isnull().sum().sum()) > 0:
        conclusion_parts.append(
            f"A total of <b>{int(df.isnull().sum().sum())} missing values</b> were detected."
        )
    if fe_steps:
        conclusion_parts.append(
            f"<b>{len(fe_steps)} feature engineering</b> transformations were applied."
        )
    if ml_result and ml_result.get('metrics'):
        m = ml_result['metrics']
        if 'accuracy' in m:
            conclusion_parts.append(
                f"The {(ml_result.get('algorithm','model')).replace('_',' ')} achieved "
                f"<b>{m['accuracy']*100:.1f}% accuracy</b>."
            )
        elif 'r2_score' in m:
            conclusion_parts.append(
                f"The model achieved an <b>R² score of {m['r2_score']}</b>."
            )

    story.append(Paragraph("Conclusion", S['h2']))
    for part in conclusion_parts:
        story.append(Paragraph(part, S['body']))

    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph(
        f"Report generated by DataWise  •  {now}",
        S['footer']
    ))

    doc.build(story)
    buf.seek(0)
    return buf.read()
