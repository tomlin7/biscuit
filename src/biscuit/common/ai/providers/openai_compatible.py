from __future__ import annotations
import json
import os
from typing import Any, Callable, ClassVar, Dict, List, Optional
import httpx
from .base import AIProvider, ProviderResponse, ToolCallData, ToolDesc

class OpenAICompatibleProvider(AIProvider):
    name = "openai_compatible"
    _models: ClassVar[Dict[str, str]] = {
        "Custom OpenAI Model": "custom-model",
    }

    def __init__(self, api_key: str = "", model: str = "custom-model", base_url: Optional[str] = None):
        super().__init__(api_key, model)
        self.base_url = (base_url or os.environ.get("OPENAI_COMPATIBLE_BASE_URL", "http://localhost:8000/v1")).rstrip("/")

    @classmethod
    def supports_model(cls, model_id: str) -> bool:
        return model_id == "custom-model" or model_id.startswith("openai-compatible:")

    async def generate(
        self,
        system_instruction: str,
        messages: List[Dict[str, Any]],
        tools: Optional[List[ToolDesc]] = None,
        stream_callback: Optional[Callable[[str], None]] = None,
    ) -> ProviderResponse:
        url = f"{self.base_url}/chat/completions"
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        payload = {
            "model": self.model.replace("openai-compatible:", ""),
            "messages": [{"role": "system", "content": system_instruction}] + messages if system_instruction else messages,
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            choice = data.get("choices", [{}])[0]
            text = choice.get("message", {}).get("content", "")
            return ProviderResponse(text=text)
