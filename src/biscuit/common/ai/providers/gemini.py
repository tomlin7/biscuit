from __future__ import annotations

import logging
from typing import Any, Callable, ClassVar, Dict, List, Optional

from google import genai
from google.genai import types

from .base import AIProvider, ProviderResponse, ToolCallData, ToolDesc


class GeminiProvider(AIProvider):
    name = "gemini"
    _models: ClassVar[Dict[str, str]] = {
        "Gemini 2.0 Flash": "gemini-2.0-flash",
        "Gemini 2.0 Pro": "gemini-2.0-pro",
        "Gemini 2.5 Flash": "gemini-2.5-flash",
        "Gemini 2.5 Pro": "gemini-2.5-pro",
    }

    def __init__(self, api_key: str, model: str):
        super().__init__(api_key, model)
        self._client: Optional[genai.Client] = None

    def _get_client(self) -> genai.Client:
        if not self._client:
            self._client = genai.Client(
                api_key=self.api_key,
                http_options=types.HttpOptions(
                    retry_options=types.HttpRetryOptions(attempts=3)
                ),
            )
        return self._client

    def _convert_messages(self, messages: List[Dict]) -> List[types.Content]:
        contents = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            tool_calls = msg.get("tool_calls")

            if role == "tool":
                contents.append(types.Content(
                    role="user",
                    parts=[types.Part(
                        function_response=types.FunctionResponse(
                            name=msg.get("name", ""),
                            response={"result": content},
                        )
                    )],
                ))
            elif tool_calls:
                parts = []
                if content:
                    parts.append(types.Part(text=content))
                for tc in tool_calls:
                    parts.append(types.Part(
                        function_call=types.FunctionCall(
                            name=tc.get("name", ""),
                            args=tc.get("args", {}),
                        )
                    ))
                contents.append(types.Content(role="model", parts=parts))
            else:
                gemini_role = "user" if role == "user" else "model"
                contents.append(types.Content(
                    role=gemini_role,
                    parts=[types.Part(text=content)],
                ))
        return contents

    def _convert_tools(self, tools: List[ToolDesc]) -> List[types.Tool]:
        declarations = []
        for tool in tools:
            schema = tool.input_schema
            properties = {}
            required = []

            raw_props = schema.get("properties", {})
            for prop_name, prop_info in raw_props.items():
                p_type = prop_info.get("type", "string").upper()
                if p_type == "INTEGER":
                    p_type = "INTEGER"
                elif p_type == "NUMBER":
                    p_type = "NUMBER"
                elif p_type == "BOOLEAN":
                    p_type = "BOOLEAN"
                elif p_type == "ARRAY":
                    p_type = "ARRAY"
                else:
                    p_type = "STRING"

                kwargs: Dict[str, Any] = {
                    "type": p_type,
                    "description": prop_info.get("description", ""),
                }

                if p_type == "ARRAY":
                    item_info = prop_info.get("items", {"type": "string"})
                    item_type = item_info.get("type", "string").upper()
                    kwargs["items"] = types.Schema(
                        type={
                            "INTEGER": "INTEGER",
                            "NUMBER": "NUMBER",
                            "BOOLEAN": "BOOLEAN",
                            "OBJECT": "OBJECT",
                            "ARRAY": "ARRAY",
                        }.get(item_type, "STRING")
                    )

                properties[prop_name] = types.Schema(**kwargs)
                if prop_name in schema.get("required", []):
                    required.append(prop_name)

            declarations.append(types.FunctionDeclaration(
                name=tool.name,
                description=tool.description,
                parameters=types.Schema(
                    type="OBJECT",
                    properties=properties,
                    required=required,
                ),
            ))
        return [types.Tool(function_declarations=declarations)]

    async def generate(
        self,
        system_instruction: str,
        messages: List[Dict[str, Any]],
        tools: Optional[List[ToolDesc]] = None,
        stream_callback: Optional[Callable[[str], None]] = None,
    ) -> ProviderResponse:
        client = self._get_client()
        contents = self._convert_messages(messages)

        config_kwargs: Dict[str, Any] = {
            "system_instruction": system_instruction,
            "temperature": 0,
        }
        if tools:
            config_kwargs["tools"] = self._convert_tools(tools)

        try:
            stream = await client.aio.models.generate_content_stream(
                model=self.model,
                contents=contents,
                config=types.GenerateContentConfig(**config_kwargs),
            )
        except Exception as e:
            err_msg = str(e).lower()
            if "429" in err_msg or "resource_exhausted" in err_msg:
                raise RuntimeError("Rate limit exceeded for Gemini API") from e
            if "401" in err_msg or "authentication" in err_msg:
                raise RuntimeError("Invalid Gemini API key") from e
            raise RuntimeError(f"Gemini API error: {e}") from e

        model_parts: List[types.Part] = []
        input_tokens = 0
        output_tokens = 0

        async for response in stream:
            if not response.candidates:
                continue
            candidate = response.candidates[0]
            if not candidate.content or not candidate.content.parts:
                continue
            for part in candidate.content.parts:
                if part.text and stream_callback:
                    stream_callback(part.text)
                model_parts.append(part)
            if response.usage_metadata:
                input_tokens = response.usage_metadata.prompt_token_count or 0
                output_tokens = response.usage_metadata.candidates_token_count or 0

        text = "".join(p.text or "" for p in model_parts if p.text)
        fcs = [p.function_call for p in model_parts if p.function_call]

        if fcs:
            return ProviderResponse(
                text=text,
                tool_calls=[
                    ToolCallData(name=fc.name, args=dict(fc.args))
                    for fc in fcs
                ],
                input_tokens=input_tokens,
                output_tokens=output_tokens,
            )

        return ProviderResponse(
            text=text,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        )
