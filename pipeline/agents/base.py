"""Base agent — wraps the Anthropic async client with an agentic tool-use loop."""

import anthropic
from app.config import settings
from tools.web_search import search as tavily_search, WEB_SEARCH_TOOL


class BaseAgent:
    """
    Every stage agent inherits from this class.

    Key design choices:
    - Uses AsyncAnthropic for non-blocking API calls inside FastAPI.
    - System prompt is cached via cache_control to reduce repeat costs.
    - Supports optional Tavily web_search tool with a multi-turn agentic loop.
    - Supports extended thinking for deep-reasoning stages (Risk, Memo).
    """

    name: str = "BaseAgent"
    model: str = settings.model_smart
    use_tools: bool = False
    use_extended_thinking: bool = False
    thinking_budget: int = 10_000   # tokens Claude may use for thinking
    max_output_tokens: int = 8_000

    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    # ── Tool executor ──────────────────────────────────────────────────────────
    async def _execute_tool(self, tool_name: str, tool_input: dict) -> str:
        if tool_name == "web_search":
            query = tool_input.get("query", "")
            max_results = tool_input.get("max_results", 5)
            return await tavily_search(query, max_results)
        return f"Unknown tool: {tool_name}"

    # ── Core API call with agentic loop ───────────────────────────────────────
    async def call_claude(
        self,
        system_prompt: str,
        user_message: str,
        max_tool_rounds: int = 8,
    ) -> tuple[str, int]:
        """
        Call Claude and handle multi-turn tool use automatically.

        Returns:
            (response_text, total_tokens_used)
        """
        # Build system with prompt caching
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
            kwargs["thinking"] = {
                "type": "enabled",
                "budget_tokens": self.thinking_budget,
            }
            # Extended thinking needs more output budget
            kwargs["max_tokens"] = max(self.max_output_tokens, self.thinking_budget + 4_000)

        rounds = 0
        while True:
            response = await self.client.messages.create(**kwargs)
            total_tokens += response.usage.input_tokens + response.usage.output_tokens

            # Extract text blocks from this response
            text_blocks = [
                block.text
                for block in response.content
                if hasattr(block, "text") and block.type == "text"
            ]

            # No tool calls → done
            if response.stop_reason != "tool_use" or not self.use_tools:
                return "\n".join(text_blocks), total_tokens

            # Safety: cap tool rounds
            if rounds >= max_tool_rounds:
                return "\n".join(text_blocks), total_tokens

            # Add full assistant response (incl. thinking blocks) to history
            messages.append({"role": "assistant", "content": response.content})

            # Execute all tool calls in this response
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

    # ── Abstract interface ────────────────────────────────────────────────────
    async def run(self, state) -> any:
        """Override in each subclass. Receives and returns PipelineState."""
        raise NotImplementedError
