"""Base agent — a provider-agnostic LLM client with an agentic tool-use loop.

Supports two API styles:
- "anthropic": the Anthropic Messages API (prompt caching, extended thinking).
- "openai-compatible": OpenAI chat completions, also spoken by DeepSeek and
  Zhipu GLM (with a custom base_url).

The provider, model, and key arrive from the orchestrator, which resolves them
from the user's stored provider, API key, and chosen effort level.
"""

import json
import re

import anthropic
from openai import AsyncOpenAI, NOT_GIVEN

from app.config import settings
from pipeline.providers import PROVIDERS
from tools.web_search import search as tavily_search, WEB_SEARCH_TOOL

# ── House style, appended to every system prompt ──────────────────────────────
# Investor-grade output discipline, enforced at the prompt level for every
# provider (post-processing alone cannot fix prose style).
STYLE_GUIDE = """\

OUTPUT STYLE RULES (mandatory, apply to everything you write):
- Write professional, plain prose in the style of Google's developer
  documentation: clear, direct, specific, and neutral in tone.
- No emojis of any kind.
- No em dashes. Use commas, colons, parentheses, or separate sentences.
- No tick marks, check marks, crosses, arrows, stars, or any other decorative
  symbols or glyphs.
- Mark data quality only with the bracketed words [CONFIRMED], [ESTIMATED],
  or [UNKNOWN].
"""

# ── Meta-commentary stripper ───────────────────────────────────────────────────
# Models often open their final response with "thinking aloud" sentences before
# the actual structured content. We strip these so investors see clean output.
_META_LINE = re.compile(
    r'^(?:'
    r'Excellent[!.]?'
    r'|Great[!.]?'
    r'|Perfect[!.]?'
    r'|Now I(?:\'ve| have)\b'
    r'|I(?:\'ve| have) (?:now |gathered|completed|collected|researched|found|compiled|performed|conducted)'
    r'|I(?:\'ll| will) now\b'
    r'|Let me (?:now |compile|create|write|analyze|synthesize|put together|structure)'
    r'|Based on (?:(?:all |my |the ))?(?:research|searches?|web searches?|the (?:above|information|data|research))'
    r'|Having (?:gathered|completed|searched|researched|analyzed|conducted)'
    r'|With (?:this|the|all) (?:information|data|research|context)'
    r'|From (?:my|the) (?:research|searches?|analysis)'
    r'|The (?:research|searches?|web searches?) (?:reveal|show|indicate|provide)'
    r')\b.*',
    re.IGNORECASE,
)


def _clean_meta_commentary(text: str) -> str:
    """Strip leading "thinking aloud" lines that precede the structured output."""
    lines = text.split('\n')
    start = 0
    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            start = i + 1
            continue
        if _META_LINE.match(stripped):
            start = i + 1
        else:
            break
    return '\n'.join(lines[start:]).lstrip('\n')


# The web_search tool in OpenAI function-calling format (derived from the
# Anthropic definition so both stay in sync).
_OPENAI_WEB_SEARCH_TOOL = {
    "type": "function",
    "function": {
        "name": WEB_SEARCH_TOOL["name"],
        "description": WEB_SEARCH_TOOL["description"],
        "parameters": WEB_SEARCH_TOOL["input_schema"],
    },
}


class BaseAgent:
    """
    Every stage agent inherits from this class.

    Subclasses declare a `tier` ("fast" for web-research stages, "smart" for
    reasoning stages); the orchestrator resolves the tier to a concrete model
    for the user's provider and effort level.
    """

    name: str = "BaseAgent"
    tier: str = "smart"  # "fast" | "smart"
    use_tools: bool = False
    use_extended_thinking: bool = False
    thinking_budget: int = 10_000
    max_output_tokens: int = 8_000

    def __init__(
        self,
        api_key: str | None = None,
        provider: str = "anthropic",
        model: str | None = None,
    ):
        self.provider = provider
        self.meta = PROVIDERS[provider]
        # Fallbacks keep direct/legacy instantiation working (Anthropic defaults).
        self.model = model or (settings.model_fast if self.tier == "fast" else settings.model_smart)
        key = api_key or (settings.anthropic_api_key if provider == "anthropic" else None)
        if not key:
            raise ValueError(f"No API key available for provider '{provider}'.")

        if self.meta.api_style == "anthropic":
            self.client = anthropic.AsyncAnthropic(api_key=key)
        else:
            self.client = AsyncOpenAI(api_key=key, base_url=self.meta.base_url)

    # ── Tool executor ──────────────────────────────────────────────────────────
    async def _execute_tool(self, tool_name: str, tool_input: dict) -> str:
        if tool_name == "web_search":
            query = tool_input.get("query", "")
            max_results = tool_input.get("max_results", 5)
            return await tavily_search(query, max_results)
        return f"Unknown tool: {tool_name}"

    # ── Core API call ──────────────────────────────────────────────────────────
    async def call_llm(
        self,
        system_prompt: str,
        user_message: str,
        max_tool_rounds: int = 8,
    ) -> tuple[str, int]:
        """
        Call the configured provider and handle multi-turn tool use.

        Returns:
            (response_text, total_tokens_used)
        """
        system_prompt = system_prompt + STYLE_GUIDE
        if self.meta.api_style == "anthropic":
            return await self._call_anthropic(system_prompt, user_message, max_tool_rounds)
        return await self._call_openai_compatible(system_prompt, user_message, max_tool_rounds)

    # ── Anthropic Messages API ─────────────────────────────────────────────────
    async def _call_anthropic(
        self, system_prompt: str, user_message: str, max_tool_rounds: int
    ) -> tuple[str, int]:
        system = [
            {
                "type": "text",
                "text": system_prompt,
                "cache_control": {"type": "ephemeral"},
            }
        ]
        messages = [{"role": "user", "content": user_message}]
        total_tokens = 0

        kwargs: dict = {
            "model": self.model,
            "max_tokens": self.max_output_tokens,
            "system": system,
            "messages": messages,
        }
        if self.use_tools:
            kwargs["tools"] = [WEB_SEARCH_TOOL]
        if self.use_extended_thinking:
            kwargs["thinking"] = {"type": "enabled", "budget_tokens": self.thinking_budget}
            kwargs["max_tokens"] = max(self.max_output_tokens, self.thinking_budget + 4_000)

        rounds = 0
        while True:
            response = await self.client.messages.create(**kwargs)
            total_tokens += response.usage.input_tokens + response.usage.output_tokens

            text_blocks = [
                block.text
                for block in response.content
                if hasattr(block, "text") and block.type == "text"
            ]

            if response.stop_reason != "tool_use" or not self.use_tools:
                return _clean_meta_commentary("\n".join(text_blocks)), total_tokens
            if rounds >= max_tool_rounds:
                return _clean_meta_commentary("\n".join(text_blocks)), total_tokens

            messages.append({"role": "assistant", "content": response.content})
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = await self._execute_tool(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result,
                    })
            messages.append({"role": "user", "content": tool_results})
            kwargs["messages"] = messages
            rounds += 1

    # ── OpenAI-compatible chat completions (OpenAI, DeepSeek, GLM) ────────────
    async def _call_openai_compatible(
        self, system_prompt: str, user_message: str, max_tool_rounds: int
    ) -> tuple[str, int]:
        messages: list[dict] = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ]
        total_tokens = 0

        kwargs: dict = {
            "model": self.model,
            "messages": messages,
            "tools": [_OPENAI_WEB_SEARCH_TOOL] if self.use_tools else NOT_GIVEN,
        }
        if self.provider == "openai":
            # GPT-5-family models take max_completion_tokens and a reasoning knob.
            kwargs["max_completion_tokens"] = self.max_output_tokens + (
                self.thinking_budget if self.use_extended_thinking else 0
            )
            kwargs["reasoning_effort"] = "high" if self.use_extended_thinking else "low"
        else:
            kwargs["max_tokens"] = self.max_output_tokens

        rounds = 0
        while True:
            response = await self.client.chat.completions.create(**kwargs)
            usage = response.usage
            if usage:
                total_tokens += (usage.prompt_tokens or 0) + (usage.completion_tokens or 0)

            message = response.choices[0].message
            tool_calls = message.tool_calls or []

            if not tool_calls or not self.use_tools or rounds >= max_tool_rounds:
                return _clean_meta_commentary(message.content or ""), total_tokens

            messages.append({
                "role": "assistant",
                "content": message.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                    }
                    for tc in tool_calls
                ],
            })
            for tc in tool_calls:
                try:
                    args = json.loads(tc.function.arguments or "{}")
                except json.JSONDecodeError:
                    args = {}
                result = await self._execute_tool(tc.function.name, args)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result,
                })
            kwargs["messages"] = messages
            rounds += 1

    # ── Abstract interface ────────────────────────────────────────────────────
    async def run(self, state) -> any:
        """Override in each subclass. Receives and returns PipelineState."""
        raise NotImplementedError
