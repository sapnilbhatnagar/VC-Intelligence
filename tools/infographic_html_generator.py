"""HTML/CSS infographic generator — self-contained dark-theme investment one-pager."""

import re
from pathlib import Path
from datetime import datetime
from app.config import settings


REC_COLORS = {
    "STRONG BUY": "#10B981",
    "BUY": "#3B82F6",
    "HOLD": "#F59E0B",
    "PASS": "#EF4444",
    "STRONG PASS": "#DC2626",
}


def _clean(text: str) -> str:
    return re.sub(r"[^\x20-\x7E]", "", str(text)).strip()


def _risk_color(score: float) -> str:
    if score <= 3:
        return "#10B981"
    if score <= 6:
        return "#F59E0B"
    return "#EF4444"


def _risk_label(score: float) -> str:
    if score <= 3:
        return "LOW RISK"
    if score <= 6:
        return "MEDIUM RISK"
    return "HIGH RISK"


def _build_revenue_svg(financial_projections: dict | None) -> str:
    """Build an inline SVG revenue projection chart."""
    if not financial_projections or not isinstance(financial_projections, dict):
        return '<div style="text-align:center;color:#475569;padding:40px 0;">Revenue projections not available</div>'

    cur = financial_projections.get("current_arr", 1.0)
    year_start = financial_projections.get("year_start", 2025)
    b_rates = financial_projections.get("bear_rates", [1.3] * 5)
    m_rates = financial_projections.get("base_rates", [2.0] * 5)
    u_rates = financial_projections.get("bull_rates", [3.0] * 5)

    def proj(start, rates):
        v = [start]
        for r in rates:
            v.append(v[-1] * r)
        return v

    bear = proj(cur, b_rates)
    base = proj(cur, m_rates)
    bull = proj(cur, u_rates)
    years = list(range(year_start, year_start + len(m_rates) + 1))

    max_val = max(max(bull), 1)
    w, h = 480, 160
    pad_l, pad_r, pad_t, pad_b = 50, 20, 15, 25

    def x_pos(i):
        return pad_l + (i / (len(years) - 1)) * (w - pad_l - pad_r)

    def y_pos(v):
        return pad_t + (1 - v / (max_val * 1.15)) * (h - pad_t - pad_b)

    def polyline(data, color, dashed=False):
        pts = " ".join(f"{x_pos(i):.1f},{y_pos(v):.1f}" for i, v in enumerate(data))
        dash = ' stroke-dasharray="6,4"' if dashed else ""
        return f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="2"{dash}/>'

    # Shaded area between bear and bull
    bull_pts = " ".join(f"{x_pos(i):.1f},{y_pos(v):.1f}" for i, v in enumerate(bull))
    bear_pts = " ".join(f"{x_pos(i):.1f},{y_pos(v):.1f}" for i, v in reversed(list(enumerate(bear))))
    shade = f'<polygon points="{bull_pts} {bear_pts}" fill="#3B82F6" opacity="0.08"/>'

    # Dots and labels for base case
    dots = ""
    for i, v in enumerate(base):
        cx, cy = x_pos(i), y_pos(v)
        dots += f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="3.5" fill="#3B82F6"/>'
        label = f"${v:.1f}M" if v < 1000 else f"${v / 1000:.1f}B"
        dots += f'<text x="{cx:.1f}" y="{cy - 8:.1f}" text-anchor="middle" font-size="8" fill="#3B82F6" font-weight="bold">{label}</text>'

    # Year labels
    year_labels = ""
    for i, yr in enumerate(years):
        year_labels += f'<text x="{x_pos(i):.1f}" y="{h - 4}" text-anchor="middle" font-size="9" fill="#94A3B8">{yr}</text>'

    # Y-axis labels
    y_labels = ""
    for frac in [0, 0.25, 0.5, 0.75, 1.0]:
        val = max_val * 1.15 * frac
        yp = y_pos(val)
        label = f"${val:.0f}M" if val < 1000 else f"${val / 1000:.1f}B"
        y_labels += f'<text x="{pad_l - 6}" y="{yp + 3:.1f}" text-anchor="end" font-size="8" fill="#475569">{label}</text>'
        y_labels += f'<line x1="{pad_l}" y1="{yp:.1f}" x2="{w - pad_r}" y2="{yp:.1f}" stroke="#334155" stroke-width="0.5" stroke-dasharray="3,3"/>'

    svg = f'''<svg viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:Inter,sans-serif;">
  {y_labels}
  {shade}
  {polyline(bear, "#EF4444", dashed=True)}
  {polyline(base, "#3B82F6")}
  {polyline(bull, "#10B981", dashed=True)}
  {dots}
  {year_labels}
  <text x="{pad_l + 5}" y="{y_pos(bull[-1]) - 2:.1f}" font-size="8" fill="#10B981" font-weight="600">Bull</text>
  <text x="{pad_l + 5}" y="{y_pos(base[-1]) - 2:.1f}" font-size="8" fill="#3B82F6" font-weight="600">Base</text>
  <text x="{pad_l + 5}" y="{y_pos(bear[-1]) - 2:.1f}" font-size="8" fill="#EF4444" font-weight="600">Bear</text>
</svg>'''
    return svg


def _build_donut_svg(score: float, color: str) -> str:
    """Build an SVG donut/gauge for risk score."""
    r = 42
    cx, cy = 50, 50
    circumference = 2 * 3.14159 * r
    offset = circumference * (1 - score / 10)

    return f'''<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width:120px;height:120px;">
  <circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="#334155" stroke-width="8"/>
  <circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{color}" stroke-width="8"
    stroke-dasharray="{circumference:.1f}" stroke-dashoffset="{offset:.1f}"
    stroke-linecap="round" transform="rotate(-90 {cx} {cy})"
    style="transition: stroke-dashoffset 0.8s ease;"/>
  <text x="{cx}" y="{cy - 2}" text-anchor="middle" dominant-baseline="central"
    font-size="18" font-weight="bold" fill="#F1F5F9" font-family="Inter,sans-serif">{score:.1f}</text>
  <text x="{cx}" y="{cy + 14}" text-anchor="middle" font-size="9" fill="#94A3B8"
    font-family="Inter,sans-serif">/ 10</text>
</svg>'''


def generate_html_infographic(
    company_name: str,
    recommendation: str,
    risk_score: float,
    tam: str,
    funding: str,
    stage: str,
    top_highlights: list,
    top_risks: list,
    financial_projections: dict | None,
    job_id: str,
) -> str:
    """
    Generate a self-contained HTML infographic with inline CSS and SVG charts.
    Returns absolute path to the saved HTML file.
    """
    rec = recommendation.upper()
    rec_color = REC_COLORS.get(rec, "#3B82F6")
    score = float(risk_score) if risk_score else 5.0
    r_color = _risk_color(score)
    r_label = _risk_label(score)
    date_str = datetime.now().strftime("%B %d, %Y")

    # Build SVG components
    revenue_svg = _build_revenue_svg(financial_projections)
    donut_svg = _build_donut_svg(score, r_color)

    # Highlights HTML
    highlights_html = ""
    for hl in (top_highlights or [])[:4]:
        txt = _clean(hl)
        highlights_html += f'''
        <div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:12px;">
          <span style="color:#10B981;font-weight:bold;flex-shrink:0;">+</span>
          <span style="color:#F1F5F9;font-size:13px;line-height:1.5;">{txt}</span>
        </div>'''

    # Risks HTML
    risks_html = ""
    for risk in (top_risks or [])[:4]:
        txt = _clean(risk)
        risks_html += f'''
        <div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:12px;">
          <span style="color:#EF4444;font-weight:bold;flex-shrink:0;">!</span>
          <span style="color:#F1F5F9;font-size:13px;line-height:1.5;">{txt}</span>
        </div>'''

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{_clean(company_name)} — Investment Infographic</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: 'Inter', sans-serif;
    background: #0F172A;
    color: #F1F5F9;
    -webkit-font-smoothing: antialiased;
  }}
  .infographic {{
    max-width: 1120px;
    margin: 0 auto;
    padding: 32px;
    aspect-ratio: 16/9;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }}
  .header {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 16px;
    border-bottom: 2px solid #1E293B;
  }}
  .header-left {{
    display: flex;
    align-items: center;
    gap: 16px;
  }}
  .accent-bar {{
    width: 4px;
    height: 48px;
    background: #3B82F6;
    border-radius: 2px;
  }}
  .brand {{ font-size: 10px; color: #3B82F6; letter-spacing: 2px; font-weight: 700; }}
  .company-name {{ font-size: 28px; font-weight: 700; letter-spacing: -0.02em; }}
  .rec-badge {{
    display: inline-block;
    padding: 8px 24px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 14px;
    letter-spacing: 1px;
    color: {rec_color};
    background: {rec_color}22;
    border: 2px solid {rec_color};
  }}
  .header-right {{
    text-align: right;
  }}
  .conf {{ font-size: 9px; color: #475569; letter-spacing: 2px; font-weight: 600; }}
  .date {{ font-size: 12px; color: #94A3B8; }}

  .metrics-row {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }}
  .metric-card {{
    background: #1E293B;
    border: 1px solid #334155;
    border-radius: 12px;
    padding: 16px;
    text-align: center;
  }}
  .metric-label {{ font-size: 9px; color: #475569; letter-spacing: 1.5px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; }}
  .metric-value {{ font-size: 18px; font-weight: 700; }}

  .content-row {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    flex: 1;
  }}
  .panel {{
    background: #1E293B;
    border: 1px solid #334155;
    border-radius: 12px;
    padding: 20px;
    overflow: hidden;
  }}
  .panel-title {{
    font-size: 10px;
    color: #475569;
    letter-spacing: 1.5px;
    font-weight: 700;
    text-transform: uppercase;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid #334155;
  }}

  .risk-row {{
    display: flex;
    align-items: center;
    gap: 16px;
  }}
  .risk-info {{
    flex: 1;
  }}
  .risk-label {{
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 4px;
  }}
  .risk-sublabel {{
    font-size: 12px;
    color: #94A3B8;
  }}

  .footer-bar {{
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    background: #1E293B;
    border: 1px solid #334155;
    border-radius: 12px;
    padding: 12px 0;
  }}
  .footer-item {{
    text-align: center;
    padding: 0 12px;
    border-right: 1px solid #334155;
  }}
  .footer-item:last-child {{ border-right: none; }}
  .footer-label {{ font-size: 8px; color: #475569; letter-spacing: 1px; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; }}
  .footer-value {{ font-size: 13px; font-weight: 700; }}

  .disclaimer {{
    text-align: center;
    font-size: 9px;
    color: #475569;
    font-style: italic;
    padding-top: 8px;
  }}

  @media print {{
    body {{ background: #0F172A !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
    .infographic {{ padding: 16px; }}
  }}
</style>
</head>
<body>
<div class="infographic">

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <div class="accent-bar"></div>
      <div>
        <div class="brand">AI VC DUE DILIGENCE</div>
        <div class="company-name">{_clean(company_name)}</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:24px;">
      <div class="rec-badge">{_clean(rec)}</div>
      <div class="header-right">
        <div class="conf">CONFIDENTIAL</div>
        <div class="date">{date_str}</div>
      </div>
    </div>
  </div>

  <!-- Key Metrics -->
  <div class="metrics-row">
    <div class="metric-card" style="border-top: 3px solid #3B82F6;">
      <div class="metric-label">Total Addressable Market</div>
      <div class="metric-value" style="color:#3B82F6;">{_clean(tam)}</div>
    </div>
    <div class="metric-card" style="border-top: 3px solid #10B981;">
      <div class="metric-label">Total Funding Raised</div>
      <div class="metric-value" style="color:#10B981;">{_clean(funding)}</div>
    </div>
    <div class="metric-card" style="border-top: 3px solid #F59E0B;">
      <div class="metric-label">Company Stage</div>
      <div class="metric-value" style="color:#F59E0B;">{_clean(stage)}</div>
    </div>
    <div class="metric-card" style="border-top: 3px solid {r_color};">
      <div class="metric-label">Risk Score</div>
      <div style="display:flex;justify-content:center;">
        {donut_svg}
      </div>
      <div style="font-size:10px;color:{r_color};font-weight:700;margin-top:4px;">{r_label}</div>
    </div>
  </div>

  <!-- Content Row -->
  <div class="content-row">
    <!-- Revenue Chart -->
    <div class="panel">
      <div class="panel-title">5-Year Revenue Projections</div>
      {revenue_svg}
    </div>

    <!-- Highlights + Risks (stacked) -->
    <div style="display:flex;flex-direction:column;gap:16px;">
      <div class="panel" style="flex:1;border-top:3px solid #10B981;">
        <div class="panel-title" style="color:#10B981;">Investment Highlights</div>
        {highlights_html if highlights_html else '<div style="color:#475569;font-size:13px;">No highlights extracted</div>'}
      </div>
      <div class="panel" style="flex:1;border-top:3px solid #EF4444;">
        <div class="panel-title" style="color:#EF4444;">Key Risks</div>
        {risks_html if risks_html else '<div style="color:#475569;font-size:13px;">No risks extracted</div>'}
      </div>
    </div>
  </div>

  <!-- Footer Bar -->
  <div class="footer-bar">
    <div class="footer-item">
      <div class="footer-label">Recommendation</div>
      <div class="footer-value" style="color:{rec_color};">{_clean(rec)}</div>
    </div>
    <div class="footer-item">
      <div class="footer-label">Risk Score</div>
      <div class="footer-value" style="color:{r_color};">{score:.1f} / 10</div>
    </div>
    <div class="footer-item">
      <div class="footer-label">Market Size</div>
      <div class="footer-value" style="color:#3B82F6;">{_clean(tam)[:20]}</div>
    </div>
    <div class="footer-item">
      <div class="footer-label">Funding</div>
      <div class="footer-value" style="color:#10B981;">{_clean(funding)[:20]}</div>
    </div>
    <div class="footer-item">
      <div class="footer-label">Stage</div>
      <div class="footer-value" style="color:#F59E0B;">{_clean(stage)[:20]}</div>
    </div>
  </div>

  <div class="disclaimer">
    AI-generated analysis &middot; For informational purposes only &middot; Not investment advice &middot; Confidential
  </div>
</div>
</body>
</html>'''

    # Save
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe = re.sub(r"[^a-zA-Z0-9_-]", "_", company_name)[:40]
    filename = f"infographic_{safe}_{timestamp}.html"
    filepath = Path(settings.outputs_dir) / filename
    filepath.parent.mkdir(parents=True, exist_ok=True)
    filepath.write_text(html, encoding="utf-8")

    return str(filepath)
