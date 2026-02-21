"""HTML investment report generator — modern Big Tech aesthetic."""

import re
import markdown as md
from pathlib import Path
from datetime import datetime

from app.config import settings

RECOMMENDATION_COLORS = {
    "STRONG BUY": "#059669",
    "BUY": "#2563eb",
    "HOLD": "#d97706",
    "PASS": "#dc2626",
    "STRONG PASS": "#7f1d1d",
}

HTML_TEMPLATE = """\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{company_name} — VC Due Diligence Report</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {{
    --text-dark: #1a1a2e;
    --text-body: #374151;
    --text-muted: #6b7280;
    --accent: #2563eb;
    --accent-light: #dbeafe;
    --surface: #f8fafc;
    --surface-alt: #f1f5f9;
    --border: #e5e7eb;
    --white: #ffffff;
    --rec-color: {rec_color};
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--white);
    color: var(--text-body);
    line-height: 1.7;
    font-size: 15px;
    -webkit-font-smoothing: antialiased;
  }}

  /* ── Header ── */
  .report-header {{
    max-width: 800px;
    margin: 0 auto;
    padding: 48px 64px 32px;
    border-top: 4px solid var(--accent);
  }}
  .header-row {{
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    flex-wrap: wrap;
  }}
  .report-header h1 {{
    font-size: 32px;
    font-weight: 700;
    color: var(--text-dark);
    letter-spacing: -0.02em;
    line-height: 1.2;
    margin-bottom: 4px;
  }}
  .header-meta {{
    text-align: right;
    flex-shrink: 0;
  }}
  .header-date {{
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 2px;
  }}
  .header-conf {{
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-muted);
    font-weight: 600;
  }}
  .rec-badge {{
    display: inline-block;
    padding: 6px 18px;
    border-radius: 20px;
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--white);
    background: var(--rec-color);
    margin-top: 16px;
  }}

  /* ── Executive Summary callout ── */
  .exec-summary {{
    background: var(--accent-light);
    border-radius: 12px;
    padding: 24px 28px;
    margin: 32px 0;
    border: 1px solid #bfdbfe;
  }}
  .exec-summary h2 {{
    font-size: 16px;
    font-weight: 700;
    color: var(--accent);
    margin-bottom: 12px;
    border: none;
    padding: 0;
  }}
  .exec-summary p, .exec-summary li {{
    color: var(--text-dark);
    font-size: 14px;
  }}

  /* ── Container ── */
  .container {{
    max-width: 800px;
    margin: 0 auto;
    padding: 0 64px 80px;
  }}

  /* ── Typography ── */
  h2 {{
    font-size: 18px;
    font-weight: 600;
    color: var(--text-dark);
    border-bottom: 1px solid var(--border);
    padding-bottom: 8px;
    margin: 40px 0 16px;
    padding-left: 12px;
    border-left: 3px solid var(--accent);
  }}
  h3 {{
    font-size: 15px;
    font-weight: 600;
    color: var(--text-dark);
    margin: 28px 0 10px;
  }}
  h4 {{
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
    margin: 20px 0 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }}
  p {{ margin-bottom: 14px; }}
  ul, ol {{ margin: 0 0 16px 24px; }}
  li {{ margin-bottom: 6px; }}
  strong {{ color: var(--text-dark); font-weight: 600; }}
  em {{ font-style: italic; color: var(--text-muted); }}

  /* ── Data quality markers ── */
  .dq-confirmed {{ color: #059669; font-weight: 600; }}
  .dq-estimated {{ color: #d97706; font-weight: 600; }}
  .dq-unknown {{ color: #6b7280; font-weight: 600; }}

  /* ── Tables ── */
  table {{
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    font-size: 13px;
  }}
  th {{
    background: var(--text-dark);
    color: var(--white);
    padding: 10px 14px;
    text-align: left;
    font-weight: 600;
    font-size: 12px;
    letter-spacing: 0.3px;
  }}
  td {{
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
  }}
  tr:nth-child(even) td {{ background: var(--surface); }}
  tr:nth-child(odd) td {{ background: var(--white); }}

  /* Risk severity cells */
  td.risk-high {{ background: rgba(239, 68, 68, 0.1); color: #dc2626; font-weight: 600; }}
  td.risk-medium {{ background: rgba(245, 158, 11, 0.1); color: #d97706; font-weight: 600; }}
  td.risk-low {{ background: rgba(16, 185, 129, 0.1); color: #059669; font-weight: 600; }}

  /* ── Callout box ── */
  blockquote {{
    background: var(--surface);
    border-left: 4px solid var(--accent);
    padding: 16px 20px;
    margin: 20px 0;
    border-radius: 0 8px 8px 0;
    font-size: 14px;
    color: var(--text-dark);
  }}
  blockquote p {{ margin-bottom: 4px; }}

  /* ── Code blocks ── */
  code {{
    background: var(--surface-alt);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }}
  pre {{
    background: var(--surface-alt);
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 16px 0;
    border: 1px solid var(--border);
  }}

  /* ── Footer ── */
  .report-footer {{
    max-width: 800px;
    margin: 0 auto;
    text-align: center;
    padding: 24px 64px;
    font-size: 11px;
    color: var(--text-muted);
    border-top: 1px solid var(--border);
  }}

  /* ── Print optimization ── */
  @media print {{
    body {{ font-size: 12px; }}
    .report-header {{ border-top: 4px solid var(--accent) !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
    .exec-summary {{ background: var(--accent-light) !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
    .rec-badge {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
    th {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
    tr:nth-child(even) td {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
    h2 {{ page-break-after: avoid; }}
    table {{ page-break-inside: avoid; }}
    .report-header, h2 {{ page-break-before: auto; }}
    .container > h2 {{ page-break-before: always; }}
    .container > h2:first-of-type {{ page-break-before: avoid; }}
  }}
</style>
</head>
<body>

<div class="report-header">
  <div class="header-row">
    <div>
      <h1>{company_name}</h1>
      <span style="font-size: 13px; color: var(--text-muted);">Investment Analysis Report</span>
    </div>
    <div class="header-meta">
      <div class="header-date">{date}</div>
      <div class="header-conf">CONFIDENTIAL</div>
    </div>
  </div>
  <span class="rec-badge">{recommendation}</span>
</div>

<div class="container">
  {memo_html}
</div>

<div class="report-footer">
  Generated by AI VC Due Diligence v2.0 &nbsp;&middot;&nbsp; {date}<br>
  This report is AI-generated and for informational purposes only. Not investment advice.
</div>

</body>
</html>
"""


def _extract_recommendation(memo_text: str) -> str:
    """Pull recommendation label from the memo text."""
    for label in ("STRONG BUY", "BUY", "HOLD", "PASS"):
        if label in memo_text.upper():
            return label
    return "UNDER REVIEW"


def _post_process_html(html: str) -> str:
    """Apply post-processing to the generated HTML."""
    # Style data quality markers
    html = html.replace('[CONFIRMED]', '<span class="dq-confirmed">[CONFIRMED]</span>')
    html = html.replace('[ESTIMATED]', '<span class="dq-estimated">[ESTIMATED]</span>')
    html = html.replace('[UNKNOWN]', '<span class="dq-unknown">[UNKNOWN]</span>')

    # Add risk severity classes to table cells containing risk levels
    html = re.sub(
        r'<td>(High|Critical|Severe)</td>',
        r'<td class="risk-high">\1</td>',
        html,
        flags=re.IGNORECASE,
    )
    html = re.sub(
        r'<td>(Medium|Moderate)</td>',
        r'<td class="risk-medium">\1</td>',
        html,
        flags=re.IGNORECASE,
    )
    html = re.sub(
        r'<td>(Low|Minimal)</td>',
        r'<td class="risk-low">\1</td>',
        html,
        flags=re.IGNORECASE,
    )

    return html


def generate_html_report(
    company_name: str,
    memo_text: str,
    job_id: str,
) -> str:
    """
    Convert the investor memo markdown into a styled HTML file.

    Returns the absolute path to the saved HTML file.
    """
    recommendation = _extract_recommendation(memo_text)
    rec_color = RECOMMENDATION_COLORS.get(recommendation, "#2563eb")
    date = datetime.now().strftime("%B %d, %Y")

    # Convert markdown to HTML
    memo_html = md.markdown(
        memo_text,
        extensions=["tables", "fenced_code", "nl2br"],
    )

    # Post-process HTML for styling enhancements
    memo_html = _post_process_html(memo_html)

    html = HTML_TEMPLATE.format(
        company_name=company_name,
        date=date,
        recommendation=recommendation,
        rec_color=rec_color,
        memo_html=memo_html,
    )

    # Save
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe = re.sub(r"[^a-zA-Z0-9_-]", "_", company_name)[:40]
    filename = f"report_{safe}_{timestamp}.html"
    filepath = Path(settings.outputs_dir) / filename
    filepath.parent.mkdir(parents=True, exist_ok=True)
    filepath.write_text(html, encoding="utf-8")

    return str(filepath)
