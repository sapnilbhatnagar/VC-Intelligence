"""Base agent — wraps the Anthropic async client with an agentic tool-use loop."""

import re
import anthropic
from app.config import settings
from tools.web_search import search as tavily_search, WEB_SEARCH_TOOL

# ── Meta-commentary stripper ───────────────────────────────────────────────────
# Claude often opens its final response with "thinking aloud" sentences before
# the actual structured content.  We strip these so investors see clean output.
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
    """
    Strip LLM "thinking aloud" opener lines that precede the structured output.

    Only removes leading lines that match the meta-commentary pattern, stopping
    as soon as the first non-matching, non-blank line is encountered.
    """
    lines = text.split('\n')
    # Find where the real content starts
    start = 0
    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            start = i + 1  # skip blank lines at the top too
            continue
        if _META_LINE.match(stripped):
            start = i + 1  # this line is meta — skip it
        else:
            break           # first real content line found
    return '\n'.join(lines[start:]).lstrip('\n')


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

    def __init__(self, api_key: str | None = None):
        # Use the caller's own Claude key when supplied (unlimited / own-billing
        # mode), otherwise fall back to the server's key (credit-based runs).
        self.client = anthropic.AsyncAnthropic(api_key=api_key or settings.anthropic_api_key)

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
                return _clean_meta_commentary("\n".join(text_blocks)), total_tokens

            # Safety: cap tool rounds
            if rounds >= max_tool_rounds:
                return _clean_meta_commentary("\n".join(text_blocks)), total_tokens

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
