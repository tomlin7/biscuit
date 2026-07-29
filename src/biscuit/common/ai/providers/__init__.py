"""
AI Provider Registry
====================

Providers register themselves here. The Agent resolves providers by model ID.
Extensions can register new providers via the registry.
"""

from __future__ import annotations

import typing
from typing import Dict, List, Optional, Tuple, Type

from .base import AIProvider

_providers: Dict[str, Type[AIProvider]] = {}

def register(provider_class: Type[AIProvider]) -> None:
    _providers[provider_class.name] = provider_class

def get_provider_for_model(model_id: str) -> Optional[Type[AIProvider]]:
    for cls in _providers.values():
        if cls.supports_model(model_id):
            return cls
    return None

def resolve(model_id: str, api_key: str) -> AIProvider:
    cls = get_provider_for_model(model_id)
    if not cls:
        supported = []
        for pcls in _providers.values():
            supported.extend(pcls.get_models().values())
        raise ValueError(
            f"No provider found for model '{model_id}'. "
            f"Supported models: {', '.join(supported)}"
        )
    return cls(api_key, model_id)

def list_models() -> Dict[str, str]:
    models = {}
    for cls in _providers.values():
        models.update(cls.get_models())
    return models

def list_provider_names() -> List[str]:
    return list(_providers.keys())

def get_supported_model_ids() -> List[str]:
    ids = []
    for cls in _providers.values():
        ids.extend(cls.get_models().values())
    return ids

# Lazy registration — providers import themselves on first use
def _auto_register() -> None:
    if _providers:
        return
    from .gemini import GeminiProvider
    from .anthropic import AnthropicProvider
    from .groq import GroqProvider
    from .minimax import MiniMaxProvider
    register(GeminiProvider)
    register(AnthropicProvider)
    register(GroqProvider)
    register(MiniMaxProvider)
