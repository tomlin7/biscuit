from __future__ import annotations

import json
import os
from typing import Any, Callable, ClassVar, Dict, List, Optional

from .base import AIProvider, ProviderResponse, ToolCallData, ToolDesc


class OllamaProvider(AIProvider):
    name = "ollama"
    _models: ClassVar[Dict[str, str]] = {
        "Ollama Llama 3.2": "llama3.2",
        "Ollama Qwen 2.5 Coder": "qwen2.5-coder",
        "Ollama CodeLlama": "codellama",
    }

    def __init__(self, api_key: str = "", model: str = "llama3.2", base_url: Optional[str] = None):
        super().__init__(api_key, model)
        host = base_url or os.environ.get("OLLAMA_HOST", "http://localhost:11434")
        if not host.endswith("/v1"):
            host = host.rstrip("/") + "/v1"
        self.base_url = host

    def _build_messages(
        self,
        system_instruction: str,
        messages: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        result = []
        if system_instruction:
            result.append({"role": "system", "content": system_instruction})

        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            tool_calls = msg.get("tool_calls")

            if role == "tool":
                result.append({
                    "role": "tool",
                    "content": content,
                    "tool_call_id": msg.get("tool_call_id", ""),
                })
            elif tool_calls:
                oai_calls = []
                for tc in tool_calls:
                    oai_calls.append({
                        "id": tc.get("id", ""),
                        "type": "function",
                        "function": {
                            "name": tc.get("name", ""),
                            "arguments": json.dumps(tc.get("args", {})),
                        },
                    })
                entry: Dict[str, Any] = {"role": "assistant", "content": content}
                if oai_calls:
                    entry["tool_calls"] = oai_calls
                result.append(entry)
            else:
                result.append({"role": role, "content": content})

        return result

    def _convert_tools(self, tools: List[ToolDesc]) -> List[Dict[str, Any]]:
        return [
            {
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.input_schema,
                },
            }
            for t in tools
        ]

    async def generate(
        self,
        system_instruction: str,
        messages: List[Dict[str, Any]],
        tools: Optional[List[ToolDesc]] = None,
        stream_callback: Optional[Callable[[str], None]] = None,
    ) -> ProviderResponse:
        import httpx

        url = f"{self.base_url}/chat/completions"
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": self._build_messages(system_instruction, messages),
            "stream": stream_callback is not None,
        }

        if tools:
            payload["tools"] = self._convert_tools(tools)
            payload["tool_choice"] = "auto"

        async with httpx.AsyncClient(timeout=120.0) as client:
            if stream_callback:
                async with client.stream("POST", url, json=payload, headers=headers) as resp:
                    resp.raise_for_status()
                    collected_text: List[str] = []
                    tool_calls_dict: Dict[int, Dict[str, Any]] = {}

                    async for line in resp.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break

                        chunk = json.loads(data_str)
                        choice = chunk.get("choices", [{}])[0]
                        delta = choice.get("delta", {})

                        delta_content = delta.get("content")
                        if delta_content:
                            collected_text.append(delta_content)
                            stream_callback(delta_content)

                        for tc_chunk in delta.get("tool_calls", []):
                            idx = tc_chunk.get("index", 0)
                            if idx not in tool_calls_dict:
                                tool_calls_dict[idx] = {
                                    "id": tc_chunk.get("id", ""),
                                    "name": tc_chunk.get("function", {}).get("name", ""),
                                    "arguments": "",
                                }
                            if tc_chunk.get("id"):
                                tool_calls_dict[idx]["id"] = tc_chunk["id"]
                            func = tc_chunk.get("function", {})
                            if func.get("name"):
                                tool_calls_dict[idx]["name"] = func["name"]
                            if func.get("arguments"):
                                tool_calls_dict[idx]["arguments"] += func["arguments"]

                    full_text = "".join(collected_text)
                    final_tool_calls = None
                    if tool_calls_dict:
                        final_tool_calls = []
                        for item in tool_calls_dict.values():
                            try:
                                args = json.loads(item["arguments"]) if item["arguments"] else {}
                            except json.JSONDecodeError:
                                args = {}
                            final_tool_calls.append(
                                ToolCallData(
                                    name=item["name"],
                                    args=args,
                                    id=item["id"],
                                )
                            )

                    return ProviderResponse(
                        text=full_text if full_text else None,
                        tool_calls=final_tool_calls,
                    )
            else:
                resp = await client.post(url, json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()

                choice = data.get("choices", [{}])[0]
                msg = choice.get("message", {})
                raw_text = msg.get("content")

                tool_calls = None
                if "tool_calls" in msg and msg["tool_calls"]:
                    tool_calls = []
                    for tc in msg["tool_calls"]:
                        func = tc.get("function", {})
                        try:
                            args = json.loads(func.get("arguments", "{}"))
                        except (json.JSONDecodeError, TypeError):
                            args = {}
                        tool_calls.append(
                            ToolCallData(
                                name=func.get("name", ""),
                                args=args,
                                id=tc.get("id", ""),
                            )
                        )

                usage = data.get("usage", {})
                return ProviderResponse(
                    text=raw_text,
                    tool_calls=tool_calls,
                    input_tokens=usage.get("prompt_tokens", 0),
                    output_tokens=usage.get("completion_tokens", 0),
                )
