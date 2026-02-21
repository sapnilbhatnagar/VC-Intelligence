"""Matplotlib infographic generator — professional investment one-pager V2."""

import re
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
from matplotlib.patches import FancyBboxPatch, Wedge
import numpy as np
from pathlib import Path
from datetime import datetime

from app.config import settings

# ── Palette ───────────────────────────────────────────────────────────────────
DARK_BG     = "#0F172A"
CARD_BG     = "#1E293B"
CARD_BORDER = "#334155"
ACCENT      = "#3B82F6"
GOLD        = "#F59E0B"
GREEN       = "#10B981"
RED         = "#EF4444"
AMBER       = "#F59E0B"
TEXT_PRI    = "#F1F5F9"
TEXT_SEC    = "#94A3B8"
TEXT_DIM    = "#475569"
NAVY        = "#1E3A5F"

REC_COLORS = {
    "STRONG BUY":  ("#10B981", "#065F46"),
    "BUY":         ("#3B82F6", "#1E3A8A"),
    "HOLD":        ("#F59E0B", "#78350F"),
    "PASS":        ("#EF4444", "#7F1D1D"),
    "STRONG PASS": ("#DC2626", "#450A0A"),
}


def _clean(text: str) -> str:
    return re.sub(r"[^\x20-\x7E]", "", text).strip()


def _risk_color(score: float) -> str:
    if score <= 3:
        return GREEN
    if score <= 6:
        return AMBER
    return RED


def draw_donut_score(ax, score: float, max_val: float = 10.0, color: str = GREEN):
    """Draw a donut/gauge chart for the risk score."""
    ax.set_xlim(-1.3, 1.3)
    ax.set_ylim(-1.3, 1.3)
    ax.set_aspect("equal")
    ax.axis("off")

    # Background ring
    bg_wedge = Wedge(
        (0, 0), 1.0, 0, 360, width=0.3,
        facecolor=CARD_BORDER, edgecolor="none", zorder=1,
    )
    ax.add_patch(bg_wedge)

    # Score arc (counterclockwise from top)
    angle = (score / max_val) * 360
    score_wedge = Wedge(
        (0, 0), 1.0, 90, 90 - angle, width=0.3,
        facecolor=color, edgecolor="none", zorder=2,
    )
    ax.add_patch(score_wedge)

    # Center labels
    ax.text(0, 0.12, f"{score:.1f}", ha="center", va="center",
            fontsize=22, fontweight="bold", color=TEXT_PRI, zorder=3)
    ax.text(0, -0.28, f"/ {max_val:.0f}", ha="center", va="center",
            fontsize=10, color=TEXT_SEC, zorder=3)


def generate_infographic(
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
    Generate a professional dark-theme investment infographic summary.

    Returns absolute path to the saved PNG.
    """
    rec = recommendation.upper()
    rec_color_fg, _rec_color_bg = REC_COLORS.get(rec, (ACCENT, NAVY))
    date_str = datetime.now().strftime("%B %d, %Y")
    score = float(risk_score) if risk_score else 5.0
    r_color = _risk_color(score)

    # ── Figure ────────────────────────────────────────────────────────────────
    fig = plt.figure(figsize=(18, 12), facecolor=DARK_BG)
    fig.patch.set_facecolor(DARK_BG)

    gs = gridspec.GridSpec(
        4, 4,
        figure=fig,
        height_ratios=[0.14, 0.20, 0.44, 0.22],
        width_ratios=[1, 1, 1, 1],
        hspace=0.35, wspace=0.25,
        left=0.03, right=0.97, top=0.96, bottom=0.04,
    )

    # ── Row 0: Header ─────────────────────────────────────────────────────────
    ax_hdr = fig.add_subplot(gs[0, :])
    ax_hdr.set_xlim(0, 1)
    ax_hdr.set_ylim(0, 1)
    ax_hdr.axis("off")
    ax_hdr.set_facecolor(DARK_BG)

    # Left accent bar
    ax_hdr.add_patch(FancyBboxPatch(
        (0, 0.05), 0.006, 0.9, boxstyle="square,pad=0",
        facecolor=ACCENT, edgecolor="none",
    ))
    # Brand label
    ax_hdr.text(0.014, 0.78, "AI VC DUE DILIGENCE",
                fontsize=8, color=ACCENT, fontfamily="monospace", fontweight="bold",
                transform=ax_hdr.transAxes)
    ax_hdr.text(0.014, 0.22, _clean(company_name),
                fontsize=28, fontweight="bold", color=TEXT_PRI,
                transform=ax_hdr.transAxes)

    # Date + confidential
    ax_hdr.text(0.98, 0.78, "CONFIDENTIAL",
                fontsize=7, color=TEXT_DIM, ha="right", fontfamily="monospace",
                transform=ax_hdr.transAxes)
    ax_hdr.text(0.98, 0.22, date_str,
                fontsize=9, color=TEXT_SEC, ha="right",
                transform=ax_hdr.transAxes)

    # Recommendation badge (right side)
    badge_x = 0.72
    ax_hdr.add_patch(FancyBboxPatch(
        (badge_x, 0.05), 0.25, 0.9,
        boxstyle="round,pad=0.02",
        facecolor=rec_color_fg, edgecolor="none", alpha=0.15,
        transform=ax_hdr.transAxes, zorder=2,
    ))
    ax_hdr.add_patch(FancyBboxPatch(
        (badge_x, 0.05), 0.25, 0.9,
        boxstyle="round,pad=0.02",
        facecolor="none", edgecolor=rec_color_fg, linewidth=2,
        transform=ax_hdr.transAxes, zorder=3,
    ))
    ax_hdr.text(badge_x + 0.125, 0.55, _clean(rec),
                fontsize=14, fontweight="bold", color=rec_color_fg,
                ha="center", va="center", transform=ax_hdr.transAxes, zorder=4)
    ax_hdr.text(badge_x + 0.125, 0.18, "RECOMMENDATION",
                fontsize=6, color=TEXT_SEC, ha="center", fontfamily="monospace",
                transform=ax_hdr.transAxes, zorder=4)

    # Divider line
    ax_hdr.axhline(-0.08, color=CARD_BORDER, linewidth=1.5, xmin=0, xmax=1)

    # ── Row 1: Key Metrics Cards ───────────────────────────────────────────────
    metrics = [
        ("TOTAL ADDRESSABLE MARKET", _clean(tam), ACCENT),
        ("TOTAL FUNDING RAISED", _clean(funding), GREEN),
        ("COMPANY STAGE", _clean(stage), GOLD),
    ]

    for col, (label, value, accent_col) in enumerate(metrics):
        ax_m = fig.add_subplot(gs[1, col])
        ax_m.set_xlim(0, 1)
        ax_m.set_ylim(0, 1)
        ax_m.axis("off")
        ax_m.set_facecolor(DARK_BG)

        # Card background
        ax_m.add_patch(FancyBboxPatch(
            (0.03, 0.08), 0.94, 0.84,
            boxstyle="round,pad=0.02",
            facecolor=CARD_BG, edgecolor=CARD_BORDER, linewidth=1,
        ))
        # Top accent bar
        ax_m.add_patch(FancyBboxPatch(
            (0.03, 0.83), 0.94, 0.09,
            boxstyle="square,pad=0",
            facecolor=accent_col, edgecolor="none", alpha=0.8,
        ))

        disp_val = value if len(value) <= 18 else value[:16] + "..."
        fontsize_val = 16 if len(disp_val) <= 12 else 12

        ax_m.text(0.5, 0.83, label, ha="center", va="bottom", fontsize=7,
                  color=TEXT_DIM, fontfamily="monospace", fontweight="bold",
                  transform=ax_m.transAxes)
        ax_m.text(0.5, 0.44, disp_val, ha="center", va="center",
                  fontsize=fontsize_val, fontweight="bold", color=TEXT_PRI,
                  transform=ax_m.transAxes)

    # Risk Score — donut chart
    ax_donut_outer = fig.add_subplot(gs[1, 3])
    ax_donut_outer.set_facecolor(DARK_BG)
    ax_donut_outer.set_xlim(0, 1)
    ax_donut_outer.set_ylim(0, 1)
    ax_donut_outer.axis("off")
    ax_donut_outer.add_patch(FancyBboxPatch(
        (0.03, 0.08), 0.94, 0.84,
        boxstyle="round,pad=0.02",
        facecolor=CARD_BG, edgecolor=CARD_BORDER, linewidth=1,
    ))
    ax_donut_outer.text(0.5, 0.92, "RISK SCORE", ha="center", va="top", fontsize=7,
                        color=TEXT_DIM, fontfamily="monospace", fontweight="bold",
                        transform=ax_donut_outer.transAxes)

    # Inset axes for the donut
    ax_donut = ax_donut_outer.inset_axes([0.1, 0.1, 0.8, 0.75])
    draw_donut_score(ax_donut, score, 10.0, r_color)

    risk_label = "LOW RISK" if score <= 3 else ("MEDIUM RISK" if score <= 6 else "HIGH RISK")
    ax_donut_outer.text(0.5, 0.08, risk_label, ha="center", va="bottom", fontsize=7,
                        color=r_color, fontweight="bold", fontfamily="monospace",
                        transform=ax_donut_outer.transAxes)

    # ── Row 2: Revenue Chart (left 2 cols) + Highlights + Risks ──────────────
    ax_chart = fig.add_subplot(gs[2, :2])
    ax_chart.set_facecolor(CARD_BG)
    for spine in ax_chart.spines.values():
        spine.set_color(CARD_BORDER)

    if financial_projections and isinstance(financial_projections, dict):
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

        years = list(range(year_start, year_start + len(m_rates) + 1))
        bear_v = proj(cur, b_rates)
        base_v = proj(cur, m_rates)
        bull_v = proj(cur, u_rates)

        ax_chart.fill_between(years, bear_v, bull_v, alpha=0.12, color=ACCENT)
        ax_chart.plot(years, bear_v, "o--", color=RED, lw=1.8, ms=5, label="Bear", alpha=0.85)
        ax_chart.plot(years, base_v, "s-", color=ACCENT, lw=2.5, ms=7, label="Base")
        ax_chart.plot(years, bull_v, "^--", color=GREEN, lw=1.8, ms=5, label="Bull", alpha=0.85)

        # Value labels on base scenario points
        for x, y in zip(years, base_v):
            ax_chart.annotate(
                f"${y:.1f}M", (x, y),
                textcoords="offset points", xytext=(0, 8),
                ha="center", fontsize=7, color=ACCENT, fontweight="bold",
            )

        ax_chart.set_ylabel("ARR ($M)", fontsize=9, color=TEXT_SEC)
        ax_chart.yaxis.set_label_coords(-0.08, 0.5)
    else:
        ax_chart.text(0.5, 0.5, "Revenue projections\nnot available",
                      ha="center", va="center", color=TEXT_DIM, fontsize=11)

    ax_chart.set_title("5-Year Revenue Projections", fontsize=11,
                        fontweight="bold", color=TEXT_PRI, pad=10)
    ax_chart.legend(fontsize=8, loc="upper left",
                    facecolor=CARD_BG, edgecolor=CARD_BORDER, labelcolor=TEXT_SEC)
    ax_chart.tick_params(colors=TEXT_SEC, labelsize=8)
    ax_chart.grid(True, linestyle=":", alpha=0.3, color=CARD_BORDER)
    ax_chart.set_facecolor(CARD_BG)

    # Investment Highlights (col 2)
    ax_hi = fig.add_subplot(gs[2, 2])
    ax_hi.set_xlim(0, 1)
    ax_hi.set_ylim(0, 1)
    ax_hi.axis("off")
    ax_hi.set_facecolor(DARK_BG)
    ax_hi.add_patch(FancyBboxPatch(
        (0.02, 0.02), 0.96, 0.96,
        boxstyle="round,pad=0.02",
        facecolor=CARD_BG, edgecolor=CARD_BORDER, linewidth=1,
    ))
    # Green accent top bar
    ax_hi.add_patch(FancyBboxPatch(
        (0.02, 0.91), 0.96, 0.07, boxstyle="square,pad=0",
        facecolor=GREEN, edgecolor="none", alpha=0.7,
    ))
    ax_hi.text(0.5, 0.945, "INVESTMENT HIGHLIGHTS", ha="center", va="center",
               fontsize=7, fontweight="bold", color=DARK_BG, fontfamily="monospace",
               transform=ax_hi.transAxes)

    y = 0.83
    for hl in (top_highlights or [])[:4]:
        txt = _clean(hl)
        lines = [txt[j:j + 52] for j in range(0, min(len(txt), 104), 52)][:2]
        ax_hi.text(0.06, y, f"+ {lines[0]}", fontsize=7.5, va="top", color=TEXT_PRI,
                   transform=ax_hi.transAxes)
        if len(lines) > 1:
            ax_hi.text(0.10, y - 0.06, lines[1], fontsize=7.5, va="top", color=TEXT_SEC,
                       transform=ax_hi.transAxes)
            y -= 0.20
        else:
            y -= 0.185

    # Key Risks (col 3)
    ax_risks_r = fig.add_subplot(gs[2, 3])
    ax_risks_r.set_xlim(0, 1)
    ax_risks_r.set_ylim(0, 1)
    ax_risks_r.axis("off")
    ax_risks_r.set_facecolor(DARK_BG)
    ax_risks_r.add_patch(FancyBboxPatch(
        (0.02, 0.02), 0.96, 0.96,
        boxstyle="round,pad=0.02",
        facecolor=CARD_BG, edgecolor=CARD_BORDER, linewidth=1,
    ))
    # Red accent top bar
    ax_risks_r.add_patch(FancyBboxPatch(
        (0.02, 0.91), 0.96, 0.07, boxstyle="square,pad=0",
        facecolor=RED, edgecolor="none", alpha=0.7,
    ))
    ax_risks_r.text(0.5, 0.945, "KEY RISKS", ha="center", va="center",
                    fontsize=7, fontweight="bold", color=TEXT_PRI, fontfamily="monospace",
                    transform=ax_risks_r.transAxes)

    y = 0.83
    for risk in (top_risks or [])[:4]:
        txt = _clean(risk)
        lines = [txt[j:j + 52] for j in range(0, min(len(txt), 104), 52)][:2]
        ax_risks_r.text(0.06, y, f"! {lines[0]}", fontsize=7.5, va="top", color=RED,
                        transform=ax_risks_r.transAxes)
        if len(lines) > 1:
            ax_risks_r.text(0.10, y - 0.06, lines[1], fontsize=7.5, va="top", color=TEXT_SEC,
                            transform=ax_risks_r.transAxes)
            y -= 0.20
        else:
            y -= 0.185

    # ── Row 3: Footer summary bar ──────────────────────────────────────────────
    ax_footer = fig.add_subplot(gs[3, :])
    ax_footer.set_xlim(0, 1)
    ax_footer.set_ylim(0, 1)
    ax_footer.axis("off")
    ax_footer.set_facecolor(DARK_BG)
    ax_footer.add_patch(FancyBboxPatch(
        (0, 0.05), 1.0, 0.90, boxstyle="square,pad=0",
        facecolor=CARD_BG, edgecolor=CARD_BORDER, linewidth=1,
    ))

    summary_items = [
        ("RECOMMENDATION", _clean(recommendation), rec_color_fg),
        ("RISK SCORE", f"{score:.1f} / 10", r_color),
        ("MARKET SIZE", _clean(tam)[:20], ACCENT),
        ("FUNDING", _clean(funding)[:20], GREEN),
        ("STAGE", _clean(stage)[:20], GOLD),
    ]
    total_items = len(summary_items)
    for i, (lbl, val, col) in enumerate(summary_items):
        x = (i + 0.5) / total_items
        ax_footer.text(x, 0.82, lbl, ha="center", va="center", fontsize=6.5,
                       color=TEXT_DIM, fontfamily="monospace", fontweight="bold",
                       transform=ax_footer.transAxes)
        ax_footer.text(x, 0.42, val, ha="center", va="center", fontsize=10,
                       fontweight="bold", color=col, transform=ax_footer.transAxes)
        if i < total_items - 1:
            ax_footer.axvline(
                (i + 1) / total_items, ymin=0.15, ymax=0.95,
                color=CARD_BORDER, linewidth=0.8,
            )

    # Disclaimer
    fig.text(
        0.5, 0.005,
        "AI-generated analysis  |  For informational purposes only  |  Not investment advice  |  Confidential",
        ha="center", fontsize=7, color=TEXT_DIM, style="italic",
    )

    # ── Save ──────────────────────────────────────────────────────────────────
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe = re.sub(r"[^a-zA-Z0-9_-]", "_", company_name)[:40]
    filename = f"infographic_{safe}_{timestamp}.png"
    filepath = Path(settings.outputs_dir) / filename
    filepath.parent.mkdir(parents=True, exist_ok=True)

    plt.savefig(filepath, dpi=160, bbox_inches="tight", facecolor=DARK_BG)
    plt.close(fig)

    return str(filepath)
