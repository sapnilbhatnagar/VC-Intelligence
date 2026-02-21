"""Revenue projection chart generator using matplotlib."""

import matplotlib
matplotlib.use("Agg")  # Non-interactive backend — must be set before pyplot import
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
from pathlib import Path
from datetime import datetime

from app.config import settings


def generate_revenue_chart(
    company_name: str,
    current_arr: float,
    bear_rates: list,
    base_rates: list,
    bull_rates: list,
    year_start: int = 2025,
) -> str:
    """
    Generate a professional Bear/Base/Bull revenue projection chart.

    Args:
        company_name: Name shown in the chart title.
        current_arr: Current ARR in USD millions (e.g. 1.5 = $1.5M).
        bear_rates: List of 5 YoY growth multipliers for the bear scenario.
        base_rates: List of 5 YoY growth multipliers for the base scenario.
        bull_rates: List of 5 YoY growth multipliers for the bull scenario.
        year_start: Starting year for projections.

    Returns:
        Absolute file path of the saved PNG.
    """
    years = list(range(year_start, year_start + len(base_rates) + 1))

    def project(start: float, rates: list) -> list:
        arr = [start]
        for r in rates:
            arr.append(arr[-1] * r)
        return arr

    bear_arr = project(current_arr, bear_rates)
    base_arr = project(current_arr, base_rates)
    bull_arr = project(current_arr, bull_rates)

    # ── Chart setup ──────────────────────────────────────────────────────────
    plt.style.use("seaborn-v0_8-whitegrid")
    fig, ax = plt.subplots(figsize=(12, 6.5))
    fig.patch.set_facecolor("white")

    BLUE = "#2563eb"
    RED = "#dc2626"
    GREEN = "#059669"

    # Scenarios
    ax.plot(years, bear_arr, "o-", color=RED, linewidth=2, markersize=6,
            label="Bear Case", zorder=3, alpha=0.85)
    ax.plot(years, base_arr, "s-", color=BLUE, linewidth=3, markersize=9,
            label="Base Case", zorder=4)
    ax.plot(years, bull_arr, "^-", color=GREEN, linewidth=2, markersize=6,
            label="Bull Case", zorder=3, alpha=0.85)

    # Shaded range
    ax.fill_between(years, bear_arr, bull_arr, alpha=0.06, color=BLUE)

    # Annotate base case values
    for x, y in zip(years, base_arr):
        label = f"${y:.1f}M" if y < 1000 else f"${y / 1000:.1f}B"
        ax.annotate(
            label,
            (x, y),
            textcoords="offset points",
            xytext=(0, 14),
            ha="center",
            fontsize=9,
            fontweight="bold",
            color=BLUE,
        )

    # CAGR label for base case
    if len(base_arr) >= 2 and base_arr[0] > 0:
        cagr = ((base_arr[-1] / base_arr[0]) ** (1 / len(base_rates)) - 1) * 100
        ax.text(
            years[-1] + 0.1, base_arr[-1],
            f"CAGR: {cagr:.0f}%",
            fontsize=9, fontweight="bold", color=BLUE, va="center",
        )

    # Formatting
    ax.set_title(
        f"{company_name} — 5-Year Revenue Projection",
        fontsize=15, fontweight="bold", color="#1a1a2e", pad=16,
        fontfamily="sans-serif",
    )
    ax.set_xlabel("Year", fontsize=11, color="#374151")
    ax.set_ylabel("ARR ($ Millions)", fontsize=11, color="#374151")
    ax.set_xticks(years)
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda v, _: f"${v:.0f}M"))
    ax.legend(loc="upper left", fontsize=10, framealpha=0.95, edgecolor="#e5e7eb",
              fancybox=False)
    ax.grid(True, linestyle="-", alpha=0.15, color="#9ca3af")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color("#e5e7eb")
    ax.spines["bottom"].set_color("#e5e7eb")

    # Summary footer
    bear_label = f"${bear_arr[-1]:.1f}M" if bear_arr[-1] < 1000 else f"${bear_arr[-1] / 1000:.1f}B"
    base_label = f"${base_arr[-1]:.1f}M" if base_arr[-1] < 1000 else f"${base_arr[-1] / 1000:.1f}B"
    bull_label = f"${bull_arr[-1]:.1f}M" if bull_arr[-1] < 1000 else f"${bull_arr[-1] / 1000:.1f}B"
    footer = f"Year 5 Estimates:  Bear {bear_label}  |  Base {base_label}  |  Bull {bull_label}"
    ax.text(
        0.5, -0.1, footer,
        transform=ax.transAxes, ha="center", fontsize=9.5, color="#374151",
        bbox=dict(boxstyle="round,pad=0.4", facecolor="#f8fafc",
                  edgecolor="#e5e7eb", alpha=0.95),
    )

    plt.tight_layout(rect=[0, 0.06, 1, 1.0])

    # ── Save ─────────────────────────────────────────────────────────────────
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in company_name)
    filename = f"revenue_chart_{safe}_{timestamp}.png"
    filepath = Path(settings.outputs_dir) / filename
    filepath.parent.mkdir(parents=True, exist_ok=True)

    plt.savefig(filepath, dpi=150, bbox_inches="tight", facecolor="white")
    plt.close(fig)

    return str(filepath)
