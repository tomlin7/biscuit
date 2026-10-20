"""Exercise the real Anthropic SDK against an offline HTTP transport."""

import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import anthropic
import httpx
import pytest

from biscuit.common.ai.agent import Agent
from biscuit.common.ai.providers import _auto_register, list_models, resolve
from biscuit.common.ai.providers.base import ProviderResponse, ToolDesc
from biscuit.common.ai.providers.minimax import MiniMaxProvider
from biscuit.settings.editor.editor import SettingsEditor
from biscuit.views.ai.ai import AI


THINKING = {"type": "thinking", "thinking": "Check the file.", "signature": "test-signature"}
TEXT = {"type": "text", "text": "Done."}
TOOL = {"type": "tool_use", "id": "tool_1", "name": "read_file", "input": {"path": "a.py"}}


def message(content):
    return {
        "id": "msg_test", "type": "message", "role": "assistant",
        "model": "MiniMax-M3.1-Flash", "content": content,
        "stop_reason": "tool_use" if any(b["type"] == "tool_use" for b in content) else "end_turn",
        "stop_sequence": None, "usage": {"input_tokens": 12, "output_tokens": 8},
    }


def stream_events(content):
    initial = message([])
    initial["stop_reason"] = None
    events = [{"type": "message_start", "message": initial}]
    for index, block in enumerate(content):
        kind = block["type"]
        start = dict(block)
        if kind == "text":
            start["text"] = ""
            deltas = [{"type": "text_delta", "text": block["text"]}]
        elif kind == "thinking":
            start.update(thinking="", signature="")
            deltas = [
                {"type": "thinking_delta", "thinking": block["thinking"]},
                {"type": "signature_delta", "signature": block["signature"]},
            ]
        else:
            start["input"] = {}
            deltas = [{"type": "input_json_delta", "partial_json": json.dumps(block["input"])}]
        events.append({"type": "content_block_start", "index": index, "content_block": start})
        events.extend({"type": "content_block_delta", "index": index, "delta": delta} for delta in deltas)
        events.append({"type": "content_block_stop", "index": index})
    events.extend([
        {"type": "message_delta", "delta": {"stop_reason": message(content)["stop_reason"],
                                             "stop_sequence": None}, "usage": {"output_tokens": 8}},
        {"type": "message_stop"},
    ])
    return "".join(f"event: {event['type']}\ndata: {json.dumps(event)}\n\n" for event in events)


@pytest.fixture
async def transport(monkeypatch):
    requests = []
    responses = []
    clients = []

    def handle(request):
        assert str(request.url) == "https://api.minimax.io/anthropic/v1/messages"
        payload = json.loads(request.content)
        requests.append(payload)
        content = responses.pop(0) if responses else [THINKING, TEXT]
        if payload.get("stream"):
            return httpx.Response(200, text=stream_events(content), headers={"content-type": "text/event-stream"})
        return httpx.Response(200, json=message(content))

    async_cls = anthropic.AsyncAnthropic
    sync_cls = anthropic.Anthropic

    def async_client(**kwargs):
        client = async_cls(**kwargs, http_client=httpx.AsyncClient(transport=httpx.MockTransport(handle)))
        clients.append(client)
        return client

    def sync_client(**kwargs):
        return sync_cls(**kwargs, http_client=httpx.Client(transport=httpx.MockTransport(handle)))

    monkeypatch.setattr(anthropic, "AsyncAnthropic", async_client)
    monkeypatch.setattr(anthropic, "Anthropic", sync_client)
    yield requests, responses
    for client in clients:
        await client.close()


def assert_defaults(payload, model):
    assert payload["model"] == model
    assert payload["max_tokens"] == 8000
    # The API supplies adaptive/max for Flash and thinking-off for M3.
    for omitted in ("thinking", "output_config", "service_tier", "reasoning_effort", "temperature"):
        assert omitted not in payload


def test_catalog_and_explicit_models():
    _auto_register()
    assert list(MiniMaxProvider.get_models().values()) == ["MiniMax-M3.1-Flash", "MiniMax-M3"]
    assert MiniMaxProvider("test-key").model == "MiniMax-M3.1-Flash"
    ordinary = list_models()
    assert [mid for mid in ordinary.values() if mid.lower().startswith("minimax-")] == [
        "MiniMax-M3.1-Flash", "MiniMax-M3",
    ]
    for saved in ("minimax-m1", "minimax-text-01", "MiniMax-M2.7", "MiniMax-custom"):
        assert resolve(saved, "test-key").model == saved
        assert saved not in ordinary.values()
        assert saved in list_models(saved).values()
    assert "custom-model" in ordinary.values()
    assert resolve("openai-compatible:my-model", "test-key").name == "openai_compatible"
    assert list_models("openai-compatible:my-model")["openai-compatible:my-model"] == "openai-compatible:my-model"


@pytest.mark.parametrize("model", [None, "MiniMax-M3", "minimax-m1", "minimax-text-01", "MiniMax-M2.7", "MiniMax-custom"])
async def test_sdk_default_and_explicit_requests(transport, model):
    requests, _ = transport
    provider = MiniMaxProvider("test-key") if model is None else resolve(model, "test-key")
    result = await provider.generate("Be helpful.", [{"role": "user", "content": "Hello"}])
    assert result.text == "Done."
    assert result.assistant_content == [THINKING, TEXT]
    assert (result.input_tokens, result.output_tokens) == (12, 8)
    assert_defaults(requests[0], model or "MiniMax-M3.1-Flash")
    assert requests[0]["stream"] is True
    assert "tools" not in requests[0]


@pytest.mark.parametrize("model", ["MiniMax-M3.1-Flash", "MiniMax-M3", "minimax-m1"])
def test_sync_thinking_first_reply(transport, model):
    requests, _ = transport
    assert resolve(model, "test-key").process_message("Hello") == "Done."
    assert_defaults(requests[0], model)


@pytest.mark.parametrize("saved", ["MiniMax-M3.1-Flash", "MiniMax-M3", "minimax-m1", "MiniMax-custom",
                                   "openai-compatible:my-model", "gemini-2.5-flash", ""])
async def test_saved_sidebar_selection_reaches_transport(transport, saved):
    _auto_register()
    view = SimpleNamespace(base=MagicMock())
    view.base.config.get_nested.return_value = saved
    models = list_models(saved)
    selected = AI._load_default_model(view)
    model_id = models[selected]
    assert model_id == (saved or next(iter(list_models().values())))
    if model_id.lower().startswith("minimax-"):
        await resolve(model_id, "test-key").generate("", [{"role": "user", "content": "Hello"}])
        assert transport[0][0]["model"] == saved


@pytest.mark.parametrize("saved", ["minimax-text-01", "MiniMax-custom", "openai-compatible:my-model"])
def test_settings_keeps_saved_selection(saved):
    editor = MagicMock()
    editor.base.config.get_nested.side_effect = lambda key, default="": saved if key == "ai.default_model" else default
    SettingsEditor.add_ai(editor)
    args = editor.add_section.return_value.add_dropdown.call_args.args
    assert args[1][args[2]] == saved
    args[3](saved)
    editor.base.config.set_nested.assert_called_once_with("ai.default_model", saved)


async def test_sdk_preserves_images_video_and_legacy_tool_messages(transport):
    requests, _ = transport
    content = [
        {"type": "text", "text": "Describe these"},
        {"type": "image", "source": {"type": "url", "url": "https://example.test/image.png"}},
        {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": "aW1hZ2U="}},
        {"type": "video", "source": {"type": "url", "url": "https://example.test/video.mp4"}},
    ]
    tools = [ToolDesc("read_file", "Read a file", {"type": "object", "properties": {"path": {"type": "string"}},
                                                "required": ["path"]})]
    chunks = []
    result = await MiniMaxProvider("test-key").generate("", [
        {"role": "user", "content": content},
        {"role": "assistant", "content": "Read it", "tool_calls": [{"id": "tool_1", "name": "read_file", "args": {"path": "a.py"}}]},
        {"role": "tool", "tool_call_id": "tool_1", "content": "file contents"},
    ], tools=tools, stream_callback=chunks.append)
    assert chunks == ["Done."]
    assert result.text == "Done."
    assert requests[0]["messages"][0]["content"] == content
    assert requests[0]["messages"][1]["content"][1] == TOOL
    assert requests[0]["messages"][2]["content"][0]["tool_use_id"] == "tool_1"
    assert requests[0]["tools"][0]["input_schema"] == tools[0].input_schema


async def test_agent_replays_complete_reasoning_tool_history(transport, monkeypatch):
    requests, responses = transport
    responses.extend([[THINKING, TOOL], [THINKING, TEXT], [THINKING, TEXT]])
    base = MagicMock()
    base.active_directory = None
    agent = Agent(base, "test-key", "MiniMax-M3.1-Flash")
    monkeypatch.setattr(agent, "_get_system_instruction", lambda: "Be helpful.")
    tool = MagicMock()
    tool.name = "read_file"
    tool.description = "Read a file"
    tool.args_schema.schema.return_value = {"properties": {"path": {"type": "string"}}, "required": ["path"]}
    tool.run.return_value = "file contents"
    agent.tools = [tool]
    first = await agent.execute_task_with_streaming("Read a.py")
    assert first.status.name == "COMPLETED"
    assert len(requests) == 2
    assert requests[1]["messages"][1] == {"role": "assistant", "content": [THINKING, TOOL]}
    assert requests[1]["messages"][2]["content"] == [
        {"type": "tool_result", "tool_use_id": "tool_1", "content": "file contents"},
    ]
    await agent.execute_task_with_streaming("What next?")
    assert len(requests) == 3
    assert requests[2]["messages"][:3] == requests[1]["messages"]
    assert requests[2]["messages"][3] == {"role": "assistant", "content": [THINKING, TEXT]}
    assert requests[2]["messages"][4] == {"role": "user", "content": "What next?"}
    assert ProviderResponse(text="Plain reply").assistant_content is None


async def test_plain_provider_keeps_existing_text_history(monkeypatch):
    base = MagicMock()
    base.active_directory = None
    agent = Agent(base, "test-key", "custom-model")
    monkeypatch.setattr(agent, "_get_system_instruction", lambda: "Be helpful.")
    agent.tools = []
    agent.provider.generate = AsyncMock(return_value=ProviderResponse(text="Plain reply"))
    await agent.execute_task_with_streaming("Hello")
    await agent.execute_task_with_streaming("Again")
    assert agent._native_history == []
    messages = agent.provider.generate.call_args.kwargs["messages"]
    assert messages[:3] == [
        {"role": "user", "content": "Hello"},
        {"role": "assistant", "content": "Plain reply"},
        {"role": "user", "content": "Again"},
    ]
