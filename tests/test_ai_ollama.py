import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from biscuit.common.ai.providers import get_provider_for_model, resolve
from biscuit.common.ai.providers.ollama import OllamaProvider
from biscuit.common.ai.providers.base import ToolDesc


def test_ollama_provider_registered():
    provider_cls = get_provider_for_model("llama3.2")
    assert provider_cls is OllamaProvider
    assert OllamaProvider.supports_model("qwen2.5-coder")
    assert OllamaProvider.supports_model("codellama")

    instance = resolve("llama3.2", api_key="")
    assert isinstance(instance, OllamaProvider)
    assert instance.model == "llama3.2"
    assert instance.base_url == "http://localhost:11434/v1"


def test_ollama_build_messages_and_tools():
    provider = OllamaProvider(model="llama3.2", base_url="http://custom:11434")
    assert provider.base_url == "http://custom:11434/v1"

    messages = [
        {"role": "user", "content": "hello"},
        {"role": "assistant", "content": "thinking", "tool_calls": [{"name": "test_tool", "args": {"arg1": "val1"}, "id": "123"}]},
        {"role": "tool", "content": "result", "tool_call_id": "123"},
    ]
    built = provider._build_messages("You are helpful", messages)
    assert len(built) == 4
    assert built[0]["role"] == "system"
    assert built[1]["role"] == "user"
    assert built[2]["role"] == "assistant"
    assert built[2]["tool_calls"][0]["function"]["name"] == "test_tool"
    assert built[3]["role"] == "tool"

    tools = [ToolDesc(name="calculator", description="math", input_schema={"type": "object"})]
    converted = provider._convert_tools(tools)
    assert len(converted) == 1
    assert converted[0]["function"]["name"] == "calculator"


@pytest.mark.asyncio
async def test_ollama_generate_mock():
    provider = OllamaProvider(model="llama3.2")

    mock_resp_data = {
        "choices": [{
            "message": {
                "role": "assistant",
                "content": "Hello from Ollama!",
                "tool_calls": []
            }
        }],
        "usage": {"prompt_tokens": 10, "completion_tokens": 5}
    }

    with patch("httpx.AsyncClient.post") as mock_post:
        mock_response = MagicMock()
        mock_response.json.return_value = mock_resp_data
        mock_response.raise_for_status = MagicMock()
        mock_post.return_value = mock_response

        res = await provider.generate("system prompt", [{"role": "user", "content": "hi"}])
        assert res.text == "Hello from Ollama!"
        assert res.input_tokens == 10
        assert res.output_tokens == 5
