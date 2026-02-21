"""Tavily web search wrapper + Claude tool definition."""

import asyncio
from tavily import TavilyClient
from app.config import settings

_client: TavilyClient | None = None


def _get_client() -> TavilyClient:
    global _client
    if _client is None:
        _client = TavilyClient(api_key=settings.tavily_api_key)
    return _client


def _search_sync(query: str, max_results: int = 5) -> str:
    """Synchronous Tavily search — runs in thread pool for async compat."""
    try:
        client = _get_client()
        response = client.search(
            query=query,
            max_results=max_results,
            search_depth="advanced",
        )

        items = []
        for r in response.get("results", []):
            title = r.get("title", "Untitled")
            url = r.get("url", "")
            content = r.get("content", "").strip()
            items.append(f"**{title}**\nSource: {url}\n{content}")

        if not items:
            return "No results found for this query."

        return "\n\n---\n\n".join(items)

    except Exception as e:
        return f"Search error: {e}"


async def search(query: str, max_results: int = 5) -> str:
    """Async wrapper — runs the sync Tavily client in a thread pool."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _search_sync, query, max_results)


# ─── Claude Tool Definition ───────────────────────────────────────────────────

WEB_SEARCH_TOOL = {
    "name": "web_search",
    "description": (
        "Search the internet for current, real-time information. Use this to find "
        "company details, funding rounds, market size data, competitor info, news, "
        "and any other facts needed for investment analysis. Be specific in your queries."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": (
                    "The search query. Be specific and targeted. "
                    "Examples: 'Agno AI startup funding Series A 2025', "
                    "'AI agent framework market size TAM 2025 billion', "
                    "'Cursor IDE competitors funding valuation 2025'"
                ),
            },
            "max_results": {
                "type": "integer",
                "description": "Results to return (3–8). Default 5.",
                "default": 5,
            },
        },
        "required": ["query"],
    },
}
