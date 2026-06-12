"""LLM provider registry — makes the pipeline API-provider agnostic.

Every analysis runs against one of the registered providers using the key the
user supplied at onboarding. The effort level chosen by the user routes each
pipeline tier (fast research stages vs. smart reasoning stages) to the right
model for that provider.
"""

import re
from dataclasses import dataclass

from app.config import settings

EFFORT_LEVELS = ("low", "medium", "high", "max")

# The passphrase that routes a user's analyses to the platform's own key
# (credits apply). Case-insensitive; commas and extra whitespace are tolerated.
_ADMIN_PHRASE = "elephant"


@dataclass(frozen=True)
class ModelPair:
    fast: str   # research stages (1, 2, 5, 8)
    smart: str  # reasoning stages (3, 4, 6)


@dataclass(frozen=True)
class ProviderMeta:
    label: str
    key_prefix: str | None   # required key prefix; None = length check only
    key_hint: str            # shown in UI / error messages
    base_url: str | None     # None = the openai/anthropic SDK default
    api_style: str           # "anthropic" | "openai-compatible"


PROVIDERS: dict[str, ProviderMeta] = {
    "anthropic": ProviderMeta(
        label="Claude (Anthropic)",
        key_prefix="sk-ant-",
        key_hint="starts with sk-ant-",
        base_url=None,
        api_style="anthropic",
    ),
    "openai": ProviderMeta(
        label="OpenAI (GPT)",
        key_prefix="sk-",
        key_hint="starts with sk-",
        base_url=None,
        api_style="openai-compatible",
    ),
    "deepseek": ProviderMeta(
        label="DeepSeek",
        key_prefix="sk-",
        key_hint="starts with sk-",
        base_url="https://api.deepseek.com",
        api_style="openai-compatible",
    ),
    "glm": ProviderMeta(
        label="GLM (Zhipu AI)",
        key_prefix=None,
        key_hint="the key from open.bigmodel.cn",
        base_url="https://open.bigmodel.cn/api/paas/v4",
        api_style="openai-compatible",
    ),
    "nvidia": ProviderMeta(
        label="NVIDIA (API Catalog)",
        key_prefix="nvapi-",
        key_hint="starts with nvapi-",
        base_url="https://integrate.api.nvidia.com/v1",
        api_style="openai-compatible",
    ),
}

# (fast, smart) per provider and effort. Fast carries the web-research stages;
# smart carries the financial model, risk assessment, and memo.
_MODEL_MATRIX: dict[str, dict[str, ModelPair]] = {
    "anthropic": {
        "low":    ModelPair("claude-haiku-4-5", "claude-haiku-4-5"),
        "medium": ModelPair("claude-haiku-4-5", "claude-sonnet-4-6"),
        "high":   ModelPair("claude-sonnet-4-6", "claude-sonnet-4-6"),
        "max":    ModelPair("claude-sonnet-4-6", "claude-opus-4-8"),
    },
    "openai": {
        "low":    ModelPair("gpt-5-nano", "gpt-5-mini"),
        "medium": ModelPair("gpt-5-mini", "gpt-5.1"),
        "high":   ModelPair("gpt-5.1", "gpt-5.1"),
        "max":    ModelPair("gpt-5.1", "gpt-5.1"),  # smart stages add high reasoning effort
    },
    "deepseek": {
        # deepseek-chat handles tool use; deepseek-reasoner carries deep reasoning.
        "low":    ModelPair("deepseek-chat", "deepseek-chat"),
        "medium": ModelPair("deepseek-chat", "deepseek-reasoner"),
        "high":   ModelPair("deepseek-chat", "deepseek-reasoner"),
        "max":    ModelPair("deepseek-chat", "deepseek-reasoner"),
    },
    "glm": {
        "low":    ModelPair("glm-4.5-air", "glm-4.5-air"),
        "medium": ModelPair("glm-4.5-air", "glm-4.6"),
        "high":   ModelPair("glm-4.6", "glm-4.6"),
        "max":    ModelPair("glm-4.6", "glm-4.6"),
    },
    "nvidia": {
        # NVIDIA's API Catalog hosts open models (Llama for tool-driven
        # research, DeepSeek for deep reasoning) behind one nvapi- key.
        "low":    ModelPair("meta/llama-3.3-70b-instruct", "meta/llama-3.3-70b-instruct"),
        "medium": ModelPair("meta/llama-3.3-70b-instruct", "deepseek-ai/deepseek-v3.1"),
        "high":   ModelPair("meta/llama-3.3-70b-instruct", "deepseek-ai/deepseek-r1"),
        "max":    ModelPair("meta/llama-3.3-70b-instruct", "deepseek-ai/deepseek-r1"),
    },
}


def resolve_models(provider: str, effort: str) -> ModelPair:
    """The (fast, smart) model pair for a provider at an effort level."""
    if provider not in _MODEL_MATRIX:
        raise ValueError(f"Unknown provider '{provider}'. Choose one of: {', '.join(PROVIDERS)}.")
    if effort not in EFFORT_LEVELS:
        raise ValueError(f"Unknown effort '{effort}'. Choose one of: {', '.join(EFFORT_LEVELS)}.")
    return _MODEL_MATRIX[provider][effort]


def validate_key_format(provider: str, key: str) -> bool:
    """Cheap shape check so obvious paste mistakes fail before an account exists."""
    meta = PROVIDERS.get(provider)
    if meta is None:
        return False
    key = key.strip()
    if len(key) < 16:
        return False
    if meta.key_prefix is None:
        return True
    if provider == "openai" and key.startswith("sk-ant-"):
        return False  # an Anthropic key pasted under the wrong provider
    return key.startswith(meta.key_prefix)


def is_admin_phrase(key: str) -> bool:
    """True when the supplied key is the platform-key passphrase."""
    normalized = re.sub(r"[,\s]+", " ", key.lower()).strip()
    return normalized == _ADMIN_PHRASE


def platform_key_for(provider: str) -> str:
    """The platform's own key for a provider (admin runs and the admin phrase)."""
    keys = {
        "anthropic": settings.anthropic_api_key,
        "openai": settings.openai_api_key,
        "deepseek": settings.deepseek_api_key,
        "glm": settings.glm_api_key,
        "nvidia": settings.nvidia_api_key,
    }
    key = keys.get(provider, "")
    if not key:
        raise ValueError(
            f"The platform has no {PROVIDERS[provider].label} key configured. "
            f"Use your own key for this provider."
        )
    return key
