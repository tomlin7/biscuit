from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Callable, ClassVar, Dict, List, Optional, Tuple


@dataclass
class ToolCallData:
    name: str
    args: Dict[str, Any]
    id: Optional[str] = None


@dataclass
class ProviderResponse:
    text: Optional[str] = None
    tool_calls: Optional[List[ToolCallData]] = None
    input_tokens: int = 0
    output_tokens: int = 0


@dataclass
class ToolDesc:
    name: str
    description: str
    input_schema: Dict[str, Any]


class AIProvider(ABC):
    name: ClassVar[str]
    _models: ClassVar[Dict[str, str]]

    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    @classmethod
    def supports_model(cls, model_id: str) -> bool:
        return model_id in cls._models.values()

    @classmethod
    def get_models(cls) -> Dict[str, str]:
        return dict(cls._models)

    @abstractmethod
    async def generate(
        self,
        system_instruction: str,
        messages: List[Dict[str, Any]],
        tools: Optional[List[ToolDesc]] = None,
        stream_callback: Optional[Callable[[str], None]] = None,
    ) -> ProviderResponse:
        ...

    def process_message(self, message: str) -> str:
        loop = asyncio.new_event_loop()
        try:
            resp = loop.run_until_complete(self.generate(
                system_instruction="",
                messages=[{"role": "user", "content": message}],
                tools=None,
            ))
            return resp.text or ""
        finally:
            loop.close()
