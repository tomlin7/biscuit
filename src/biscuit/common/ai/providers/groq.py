from __future__ import annotations

import json
from typing import Any, Callable, ClassVar, Dict, List, Optional

import httpx

from .base import AIProvider, ProviderResponse, ToolCallData, ToolDesc


class GroqProvider(AIProvider):
    name = "groq"
    _models: ClassVar[Dict[str, str]] = {
        "Groq Llama 3.3 70B": "llama-3.3-70b-versatile",
        "Groq Llama 3.1 8B": "llama-3.1-8b-instant",
        "Groq Llama 4 Scout": "llama-4-scout-17b",
        "Groq Llama 4 Maverick": "llama-4-maverick-17b",
        "Groq Gemma2 9B": "gemma2-9b-it",
        "Groq Mistral Saba 24B": "mistral-saba-24b",
        "Groq Qwen 2.5 Coder 32B": "qwen-2.5-coder-32b",
        "Groq DeepSeek R1 Distill 70B": "deepseek-r1-distill-llama-70b",
    }

    BASE_URL = "https://api.groq.com/openai/v1"

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
        oai_messages = self._build_messages(system_instruction, messages)
        oai_tools = self._convert_tools(tools) if tools else None

        body: Dict[str, Any] = {
            "model": self.model,
            "messages": oai_messages,
            "temperature": 0,
            "stream": True,
        }
        if oai_tools:
            body["tools"] = oai_tools

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=120) as client:
            try:
                async with client.stream(
                    "POST",
                    f"{self.BASE_URL}/chat/completions",
                    json=body,
                    headers=headers,
                ) as resp:
                    if resp.status_code == 429:
                        raise RuntimeError("Rate limit exceeded for Groq API")
                    if resp.status_code == 401:
                        raise RuntimeError("Invalid Groq API key")
                    if resp.status_code != 200:
                        body_text = await resp.aread()
                        raise RuntimeError(
                            f"Groq API error ({resp.status_code}): {body_text}"
                        )

                    current_text = ""
                    tool_calls_map: Dict[int, Dict] = {}
                    input_tokens = 0
                    output_tokens = 0

                    async for line in resp.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break

                        try:
                            chunk = json.loads(data_str)
                        except json.JSONDecodeError:
                            continue

                        delta = chunk.get("choices", [{}])[0].get("delta", {})

                        if delta.get("content"):
                            text = delta["content"]
                            if stream_callback:
                                stream_callback(text)
                            current_text += text

                        if delta.get("tool_calls"):
                            for tc in delta["tool_calls"]:
                                idx = tc.get("index", 0)
                                if idx not in tool_calls_map:
                                    tool_calls_map[idx] = {
                                        "id": tc.get("id", ""),
                                        "function": {
                                            "name": "",
                                            "arguments": "",
                                        },
                                    }
                                fn = tc.get("function", {})
                                if fn.get("name"):
                                    tool_calls_map[idx]["function"]["name"] = fn["name"]
                                if fn.get("arguments"):
                                    tool_calls_map[idx]["function"]["arguments"] += fn["arguments"]

                        usage = chunk.get("usage")
                        if usage:
                            input_tokens = usage.get("prompt_tokens", 0) or 0
                            output_tokens = usage.get("completion_tokens", 0) or 0

                    if tool_calls_map:
                        calls = []
                        for idx in sorted(tool_calls_map):
                            tc = tool_calls_map[idx]
                            try:
                                args = json.loads(tc["function"]["arguments"])
                            except json.JSONDecodeError:
                                args = {}
                            calls.append(ToolCallData(
                                name=tc["function"]["name"],
                                args=args,
                                id=tc.get("id", ""),
                            ))
                        return ProviderResponse(
                            text=current_text or None,
                            tool_calls=calls or None,
                            input_tokens=input_tokens,
                            output_tokens=output_tokens,
                        )

                    return ProviderResponse(
                        text=current_text or None,
                        input_tokens=input_tokens,
                        output_tokens=output_tokens,
                    )

            except httpx.TimeoutException:
                raise RuntimeError("Groq API request timed out")
