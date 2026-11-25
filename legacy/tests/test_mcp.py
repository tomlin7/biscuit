from __future__ import annotations

import json
import os
import subprocess
from unittest.mock import AsyncMock, MagicMock, PropertyMock, patch

import pytest

from biscuit.common.ai.mcp import MCPManager, MCPServer
from biscuit.common.ai.providers.base import ToolDesc


def make_mock_process(stdout_lines: list[str], return_code: int | None = None):
    """Create a mock subprocess.Popen that yields given stdout lines."""
    proc = MagicMock()
    proc.stdin = MagicMock()
    proc.poll.return_value = return_code
    proc.returncode = return_code

    stdout_mock = MagicMock()
    stdout_mock.readline.side_effect = stdout_lines
    proc.stdout = stdout_mock
    proc.stderr = MagicMock()

    return proc


class TestMCPServer:
    def test_init(self):
        server = MCPServer("test-server", "echo", ["arg1"], {"KEY": "val"})
        assert server.name == "test-server"
        assert server.command == "echo"
        assert server.args == ["arg1"]
        assert server.env.get("KEY") == "val"
        assert server._process is None
        assert server._tools == []

    def test_init_defaults(self):
        server = MCPServer("srv", "cmd")
        assert server.args == []
        assert "PATH" in server.env

    def test_tools_property_returns_copy(self):
        server = MCPServer("srv", "cmd")
        server._tools = [ToolDesc("t1", "desc", {})]
        result = server.tools
        assert len(result) == 1
        assert result[0].name == "t1"

    def test_is_running_no_process(self):
        server = MCPServer("srv", "cmd")
        assert not server.is_running()

    def test_is_running_process_dead(self):
        server = MCPServer("srv", "cmd")
        proc = MagicMock()
        proc.poll.return_value = 0
        server._process = proc
        assert not server.is_running()

    def test_is_running_process_alive(self):
        server = MCPServer("srv", "cmd")
        proc = MagicMock()
        proc.poll.return_value = None
        server._process = proc
        assert server.is_running()

    @patch("biscuit.common.ai.mcp.subprocess.Popen")
    @pytest.mark.asyncio
    async def test_start_success(self, mock_popen):
        """Happy path: initialize + tools/list succeed."""
        server = MCPServer("test", "fake-server", [])

        init_response = json.dumps({
            "jsonrpc": "2.0", "id": 1,
            "result": {"protocolVersion": "2024-11-05", "serverInfo": {"name": "fake", "version": "1.0"}},
        }) + "\n"

        tools_response = json.dumps({
            "jsonrpc": "2.0", "id": 2,
            "result": {
                "tools": [
                    {"name": "greet", "description": "say hello", "inputSchema": {"type": "object", "properties": {"name": {"type": "string"}}}},
                ]
            },
        }) + "\n"

        proc = make_mock_process([init_response, tools_response])
        mock_popen.return_value = proc

        result = await server.start()
        assert result is True

        mock_popen.assert_called_once_with(
            ["fake-server"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=server.env,
            text=True,
            bufsize=1,
        )

        assert len(server._tools) == 1
        assert server._tools[0].name == "greet"

    @patch("biscuit.common.ai.mcp.subprocess.Popen")
    @pytest.mark.asyncio
    async def test_start_initialize_fails(self, mock_popen):
        """Initialize returns None -> start returns False."""
        server = MCPServer("test", "fake-server", [])

        proc = make_mock_process([""])
        mock_popen.return_value = proc

        result = await server.start()
        assert result is False

    @patch("biscuit.common.ai.mcp.subprocess.Popen")
    @pytest.mark.asyncio
    async def test_start_popen_raises(self, mock_popen):
        """subprocess.Popen raises -> start returns False."""
        mock_popen.side_effect = FileNotFoundError("no such binary")
        server = MCPServer("test", "nonexistent", [])
        result = await server.start()
        assert result is False

    @patch("biscuit.common.ai.mcp.subprocess.Popen")
    @pytest.mark.asyncio
    async def test_request_sends_and_receives(self, mock_popen):
        server = MCPServer("test", "fake", [])
        response = json.dumps({"jsonrpc": "2.0", "id": 1, "result": {"ok": True}}) + "\n"
        proc = make_mock_process([response])
        server._process = proc

        result = await server._request("ping", {})

        written = proc.stdin.write.call_args[0][0]
        req = json.loads(written)
        assert req["method"] == "ping"
        assert req["params"] == {}

        assert result == {"ok": True}

    @patch("biscuit.common.ai.mcp.subprocess.Popen")
    @pytest.mark.asyncio
    async def test_request_no_process(self, mock_popen):
        server = MCPServer("test", "fake", [])
        result = await server._request("ping")
        assert result is None

    @patch("biscuit.common.ai.mcp.subprocess.Popen")
    @pytest.mark.asyncio
    async def test_request_handles_error_response(self, mock_popen):
        server = MCPServer("test", "fake", [])
        response = json.dumps({"jsonrpc": "2.0", "id": 1, "error": {"code": -32601, "message": "Method not found"}}) + "\n"
        proc = make_mock_process([response])
        server._process = proc

        result = await server._request("unknown_method")
        assert result is None

    @patch("biscuit.common.ai.mcp.subprocess.Popen")
    @pytest.mark.asyncio
    async def test_call_tool(self, mock_popen):
        server = MCPServer("test", "fake", [])
        response = json.dumps({
            "jsonrpc": "2.0", "id": 1,
            "result": {"content": [{"type": "text", "text": "Hello, world!"}]},
        }) + "\n"
        proc = make_mock_process([response])
        server._process = proc

        result = await server.call_tool("greet", {"name": "World"})
        assert result == "Hello, world!"

    @patch("biscuit.common.ai.mcp.subprocess.Popen")
    @pytest.mark.asyncio
    async def test_call_tool_no_content(self, mock_popen):
        server = MCPServer("test", "fake", [])
        response = json.dumps({"jsonrpc": "2.0", "id": 1, "result": {"content": []}}) + "\n"
        proc = make_mock_process([response])
        server._process = proc

        result = await server.call_tool("noop", {})
        assert result == "Tool returned no output"

    @patch("biscuit.common.ai.mcp.subprocess.Popen")
    @pytest.mark.asyncio
    async def test_call_tool_resource_content(self, mock_popen):
        server = MCPServer("test", "fake", [])
        response = json.dumps({
            "jsonrpc": "2.0", "id": 1,
            "result": {"content": [{"type": "resource", "resource": {"uri": "file:///tmp/test.txt", "text": "contents"}}]},
        }) + "\n"
        proc = make_mock_process([response])
        server._process = proc

        result = await server.call_tool("read_file", {"path": "/tmp/test.txt"})
        assert "file:///tmp/test.txt" in result

    @patch("biscuit.common.ai.mcp.subprocess.Popen")
    @pytest.mark.asyncio
    async def test_stop_terminates_process(self, mock_popen):
        server = MCPServer("test", "fake", [])
        proc = MagicMock()
        proc.poll.return_value = None
        server._process = proc
        server._tools = [ToolDesc("t", "d", {})]

        await server.stop()

        proc.terminate.assert_called_once()
        proc.wait.assert_called_once_with(timeout=5)
        assert server._process is None
        assert server._tools == []

    @patch("biscuit.common.ai.mcp.subprocess.Popen")
    @pytest.mark.asyncio
    async def test_stop_kills_if_terminate_fails(self, mock_popen):
        server = MCPServer("test", "fake", [])
        proc = MagicMock()
        proc.poll.return_value = None
        proc.wait.side_effect = Exception("timeout")
        server._process = proc

        await server.stop()
        proc.terminate.assert_called_once()
        proc.kill.assert_called_once()
        assert server._process is None


class TestMCPManager:
    def test_init(self):
        mgr = MCPManager(MagicMock())
        assert mgr.servers == {}

    def test_load_from_config_empty(self):
        mgr = MCPManager(MagicMock())
        mgr.load_from_config({})
        assert mgr.servers == {}

    def test_load_from_config_skips_invalid(self):
        mgr = MCPManager(MagicMock())
        mgr.load_from_config({"bad": "not a dict"})
        assert mgr.servers == {}

    def test_load_from_config_creates_servers(self):
        mgr = MCPManager(MagicMock())
        mgr.load_from_config({
            "srv1": {"command": "echo", "args": ["hello"], "env": {"A": "1"}},
            "srv2": {"command": "cat", "args": []},
        })
        assert len(mgr.servers) == 2
        assert isinstance(mgr.servers["srv1"], MCPServer)
        assert mgr.servers["srv1"].command == "echo"
        assert mgr.servers["srv1"].args == ["hello"]
        assert mgr.servers["srv2"].command == "cat"

    @pytest.mark.asyncio
    async def test_start_all(self):
        mgr = MCPManager(MagicMock())
        srv1 = AsyncMock(spec=MCPServer)
        srv1.start.return_value = True
        srv2 = AsyncMock(spec=MCPServer)
        srv2.start.return_value = False
        mgr.servers = {"srv1": srv1, "srv2": srv2}

        results = await mgr.start_all()
        assert results == {"srv1": True, "srv2": False}
        srv1.start.assert_awaited_once()
        srv2.start.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_stop_all(self):
        mgr = MCPManager(MagicMock())
        srv1 = AsyncMock(spec=MCPServer)
        srv2 = AsyncMock(spec=MCPServer)
        mgr.servers = {"srv1": srv1, "srv2": srv2}

        await mgr.stop_all()
        srv1.stop.assert_awaited_once()
        srv2.stop.assert_awaited_once()
        assert mgr.servers == {}

    def test_get_all_tools(self):
        mgr = MCPManager(MagicMock())
        srv1 = MagicMock(spec=MCPServer)
        srv1.tools = [ToolDesc("t1", "d1", {}), ToolDesc("t2", "d2", {})]
        srv2 = MagicMock(spec=MCPServer)
        srv2.tools = [ToolDesc("t3", "d3", {})]
        mgr.servers = {"srv1": srv1, "srv2": srv2}

        tools = mgr.get_all_tools()
        assert len(tools) == 3
        assert [t.name for t in tools] == ["t1", "t2", "t3"]

    @pytest.mark.asyncio
    async def test_call_tool_found(self):
        mgr = MCPManager(MagicMock())
        srv = AsyncMock(spec=MCPServer)
        srv.call_tool.return_value = "result"
        mgr.servers = {"srv": srv}

        result = await mgr.call_tool("srv", "greet", {"name": "World"})
        assert result == "result"
        srv.call_tool.assert_awaited_once_with("greet", {"name": "World"})

    @pytest.mark.asyncio
    async def test_call_tool_not_found(self):
        mgr = MCPManager(MagicMock())
        result = await mgr.call_tool("nonexistent", "tool", {})
        assert "not found" in result

    @pytest.mark.asyncio
    async def test_call_tool_by_name_found(self):
        mgr = MCPManager(MagicMock())
        srv = AsyncMock(spec=MCPServer)
        srv.tools = [ToolDesc("find-me", "d", {})]
        srv.call_tool.return_value = "found"
        mgr.servers = {"srv": srv}

        result = await mgr.call_tool_by_name("find-me", {"x": 1})
        assert result == "found"

    @pytest.mark.asyncio
    async def test_call_tool_by_name_not_found(self):
        mgr = MCPManager(MagicMock())
        srv = MagicMock(spec=MCPServer)
        srv.tools = [ToolDesc("other", "d", {})]
        mgr.servers = {"srv": srv}

        result = await mgr.call_tool_by_name("missing", {})
        assert result is None