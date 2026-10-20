from __future__ import annotations

from typing import Any, Callable, ClassVar, Dict, List, Optional

import anthropic

from .base import AIProvider, ProviderResponse, ToolCallData, ToolDesc

# MiniMax exposes an Anthropic-compatible Messages API at this regional endpoint
# (global region). The China region uses https://api.minimaxi.com/anthropic.
MINIMAX_ANTHROPIC_BASE_URL = "https://api.minimax.io/anthropic"


class MiniMaxProvider(AIProvider):
    name = "minimax"
    _models: ClassVar[Dict[str, str]] = {
        "MiniMax M3.1 Flash": "MiniMax-M3.1-Flash",
        "MiniMax M3": "MiniMax-M3",
    }

    @classmethod
    def supports_model(cls, model_id: str) -> bool:
        # Keep explicitly configured legacy/custom IDs out of the default catalog.
        return model_id.lower().startswith("minimax-")

    def __init__(self, api_key: str, model: str = "MiniMax-M3.1-Flash"):
        super().__init__(api_key, model)
        self._client: Optional[anthropic.AsyncAnthropic] = None

    def _get_client(self) -> anthropic.AsyncAnthropic:
        if not self._client:
            self._client = anthropic.AsyncAnthropic(
                api_key=self.api_key,
                base_url=MINIMAX_ANTHROPIC_BASE_URL,
            )
        return self._client

    def _convert_tools(self, tools: List[ToolDesc]) -> List[Dict[str, Any]]:
        result = []
        for tool in tools:
            schema = tool.input_schema
            result.append({
                "name": tool.name,
                "description": tool.description,
                "input_schema": {
                    "type": "object",
                    "properties": schema.get("properties", {}),
                    "required": schema.get("required", []),
                },
            })
        return result

    def _build_messages(self, messages: List[Dict]) -> List[Dict]:
        result = []
        i = 0
        while i < len(messages):
            msg = messages[i]
            role = msg.get("role", "user")
            content = msg.get("content", "")
            tool_calls = msg.get("tool_calls")

            if role == "tool":
                result.append({
                    "role": "user",
                    "content": [{
                        "type": "tool_result",
                        "tool_use_id": msg.get("tool_call_id", ""),
                        "content": content,
                    }],
                })
                i += 1
                continue

            if role == "assistant" and tool_calls:
                # Preserve native blocks, including thinking signatures.
                blocks = list(content) if isinstance(content, list) else []
                if content and isinstance(content, str):
                    blocks.append({"type": "text", "text": content})
                for tc in tool_calls:
                    if any(
                        block.get("type") == "tool_use"
                        and block.get("id") == tc.get("id")
                        for block in blocks
                    ):
                        continue
                    blocks.append({
                        "type": "tool_use",
                        "id": tc.get("id", f"toolu_{i}"),
                        "name": tc.get("name", ""),
                        "input": tc.get("args", {}),
                    })
                result.append({"role": "assistant", "content": blocks})
            else:
                result.append({"role": role, "content": content})

            i += 1
        return result

    async def generate(
        self,
        system_instruction: str,
        messages: List[Dict[str, Any]],
        tools: Optional[List[ToolDesc]] = None,
        stream_callback: Optional[Callable[[str], None]] = None,
    ) -> ProviderResponse:
        client = self._get_client()
        anthrow_tools = self._convert_tools(tools) if tools else None
        anthrow_messages = self._build_messages(messages)

        try:
            async with client.messages.stream(
                model=self.model,
                max_tokens=8000,
                system=system_instruction,
                tools=anthrow_tools or anthropic.NOT_GIVEN,
                messages=anthrow_messages,
                # Omit thinking/effort: Flash defaults to adaptive/max;
                # M3 defaults to thinking off on this API.
            ) as stream:
                async for event in stream:
                    if event.type == "text" and stream_callback:
                        stream_callback(event.text)

                final_message = await stream.get_final_message()
                current_text = "".join(
                    block.text for block in final_message.content
                    if block.type == "text"
                )
                assistant_content = [
                    block.model_dump(exclude_none=True)
                    for block in final_message.content
                ]

                input_tokens = 0
                output_tokens = 0
                if final_message.usage:
                    input_tokens = final_message.usage.input_tokens or 0
                    output_tokens = final_message.usage.output_tokens or 0

                tool_calls = [
                    c for c in final_message.content if c.type == "tool_use"
                ]

                if tool_calls:
                    return ProviderResponse(
                        text=current_text,
                        assistant_content=assistant_content,
                        tool_calls=[
                            ToolCallData(
                                name=tc.name,
                                args=dict(tc.input),
                                id=tc.id,
                            )
                            for tc in tool_calls
                        ],
                        input_tokens=input_tokens,
                        output_tokens=output_tokens,
                    )

                return ProviderResponse(
                    text=current_text,
                    assistant_content=assistant_content,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                )

        except Exception as e:
            err_msg = str(e).lower()
            if "429" in err_msg or "rate_limit" in err_msg:
                raise RuntimeError("Rate limit exceeded for MiniMax API") from e
            if "401" in err_msg or "authentication" in err_msg:
                raise RuntimeError("Invalid MiniMax API key") from e
            raise RuntimeError(f"MiniMax API error: {e}") from e

    def process_message(self, message: str) -> str:
        with anthropic.Anthropic(
            api_key=self.api_key,
            base_url=MINIMAX_ANTHROPIC_BASE_URL,
        ) as client:
            response = client.messages.create(
                model=self.model,
                max_tokens=8000,
                messages=[{"role": "user", "content": message}],
            )
        return "".join(
            block.text for block in response.content if block.type == "text"
        )
