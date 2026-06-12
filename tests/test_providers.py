"""Provider registry: model routing by effort, key validation, admin phrase."""

import pytest

from pipeline.providers import (
    PROVIDERS,
    EFFORT_LEVELS,
    resolve_models,
    validate_key_format,
    is_admin_phrase,
    platform_key_for,
)


def test_all_four_providers_are_registered():
    assert set(PROVIDERS) == {"anthropic", "openai", "deepseek", "glm", "nvidia"}
    for meta in PROVIDERS.values():
        assert meta.label
        assert meta.key_hint


def test_every_provider_routes_every_effort_level():
    assert EFFORT_LEVELS == ("low", "medium", "high", "max")
    for provider in PROVIDERS:
        for effort in EFFORT_LEVELS:
            models = resolve_models(provider, effort)
            assert models.fast and models.smart


def test_higher_effort_never_downgrades_the_smart_model_family():
    # Spot checks: medium routes a stronger smart model than low for each provider.
    assert resolve_models("anthropic", "low").smart == "claude-haiku-4-5"
    assert resolve_models("anthropic", "medium").smart == "claude-sonnet-4-6"
    assert resolve_models("anthropic", "max").smart == "claude-opus-4-8"
    assert resolve_models("openai", "low").smart == "gpt-5-mini"
    assert resolve_models("deepseek", "medium").smart == "deepseek-reasoner"
    assert resolve_models("glm", "high").smart == "glm-4.6"
    assert resolve_models("nvidia", "max").smart == "deepseek-ai/deepseek-r1"


def test_unknown_provider_or_effort_raises():
    with pytest.raises(ValueError):
        resolve_models("grok", "medium")
    with pytest.raises(ValueError):
        resolve_models("openai", "ultra")


def test_key_format_validation_per_provider():
    assert validate_key_format("anthropic", "sk-ant-abc123def456ghi789")
    assert not validate_key_format("anthropic", "sk-proj-abc123def456ghi789")
    assert validate_key_format("openai", "sk-proj-abc123def456ghi789")
    assert not validate_key_format("openai", "key-without-prefix-123456")
    assert validate_key_format("deepseek", "sk-abc123def456ghi789jkl")
    assert validate_key_format("glm", "a1b2c3d4e5f6.g7h8i9j0")
    assert not validate_key_format("glm", "short")
    assert validate_key_format("nvidia", "nvapi-abc123def456ghi789")
    assert not validate_key_format("nvidia", "sk-abc123def456ghi789")


def test_admin_phrase_matches_loosely():
    assert is_admin_phrase("Elephant")
    assert is_admin_phrase("elephant")
    assert is_admin_phrase("  ELEPHANT ")
    assert not is_admin_phrase("admin admin admin")
    assert not is_admin_phrase("elephants")
    assert not is_admin_phrase("sk-ant-elephant-key-12345")


def test_platform_key_lookup_uses_settings(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "openai_api_key", "sk-proj-platform")
    assert platform_key_for("openai") == "sk-proj-platform"
    monkeypatch.setattr(settings, "glm_api_key", "")
    with pytest.raises(ValueError):
        platform_key_for("glm")
