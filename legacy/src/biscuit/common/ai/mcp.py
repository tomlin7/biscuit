"""
MCP (Model Context Protocol) Support
=====================================

Manages MCP server subprocesses and exposes their tools to the Agent.
MCP servers communicate via JSON-RPC over stdio.

Protocol: https://spec.modelcontextprotocol.io
"""

from __future__ import annotations

import json
import logging
import os
import subprocess
import sys
import typing
from typing import Any, Dict, List, Optional

from .providers.base import ToolDesc

if typing.TYPE_CHECKING:
    from biscuit import App


class MCPServer:
    """A single MCP server process providing tools/resources."""

    def __init__(self, name: str, command: str, args: Optional[List[str]] = None, env: Optional[Dict[str, str]] = None):
        self.name = name
        self.command = command
        self.args = args or []
        self.env = {**os.environ, **(env or {})}
        self._process: Optional[subprocess.Popen] = None
        self._tools: List[ToolDesc] = []
        self._request_id = 0

    @property
    def tools(self) -> List[ToolDesc]:
        return list(self._tools)

    async def start(self) -> bool:
        try:
            self._process = subprocess.Popen(
                [self.command, *self.args],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=self.env,
                text=True,
                bufsize=1,
            )
            result = await self._request("initialize", {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "biscuit", "version": "1.0"},
            })
            if result is None:
                return False
            await self._list_tools()
            return True
        except Exception as e:
            logging.error(f"MCP server '{self.name}' failed to start: {e}")
            return False

    async def stop(self):
        if self._process:
            try:
                self._process.terminate()
                self._process.wait(timeout=5)
            except Exception:
                self._process.kill()
            self._process = None
            self._tools = []

    async def _request(self, method: str, params: Optional[Dict] = None) -> Optional[Any]:
        if not self._process or not self._process.stdin:
            return None

        self._request_id += 1
        request = {
            "jsonrpc": "2.0",
            "id": self._request_id,
            "method": method,
            "params": params or {},
        }

        try:
            line = json.dumps(request)
            self._process.stdin.write(line + "\n")
            self._process.stdin.flush()

            response_line = self._process.stdout.readline() if self._process.stdout else ""
            if not response_line:
                return None

            response = json.loads(response_line)
            if "error" in response:
                logging.error(f"MCP server '{self.name}' error: {response['error']}")
                return None
            return response.get("result")
        except Exception as e:
            logging.error(f"MCP request '{method}' failed: {e}")
            return None

    async def _list_tools(self):
        result = await self._request("tools/list")
        if not result:
            return
        raw_tools = result.get("tools", [])
        self._tools = []
        for t in raw_tools:
            schema = t.get("inputSchema", t.get("input_schema", {}))
            self._tools.append(ToolDesc(
                name=t.get("name", "unknown"),
                description=t.get("description", ""),
                input_schema=schema,
            ))

    async def call_tool(self, name: str, args: Dict[str, Any]) -> str:
        result = await self._request("tools/call", {"name": name, "arguments": args})
        if result is None:
            return f"Error: MCP server '{self.name}' failed to call tool '{name}'"
        content = result.get("content", [])
        parts = []
        for c in content:
            if c.get("type") == "text":
                parts.append(c.get("text", ""))
            elif c.get("type") == "resource":
                parts.append(str(c.get("resource", "")))
        return "\n".join(parts) if parts else "Tool returned no output"

    def is_running(self) -> bool:
        return self._process is not None and self._process.poll() is None


class MCPManager:
    """Manages multiple MCP server connections and exposes combined tools."""

    def __init__(self, base: "App"):
        self.base = base
        self.servers: Dict[str, MCPServer] = {}

    def load_from_config(self, config_data: Dict[str, Any]):
        for name, cfg in config_data.items():
            if not isinstance(cfg, dict):
                continue
            command = cfg.get("command", "")
            args = cfg.get("args", [])
            env = cfg.get("env", {})
            if command:
                self.servers[name] = MCPServer(name, command, args, env)

    async def start_all(self):
        results = {}
        for name, server in self.servers.items():
            results[name] = await server.start()
        return results

    async def stop_all(self):
        for server in self.servers.values():
            await server.stop()
        self.servers.clear()

    def get_all_tools(self) -> List[ToolDesc]:
        tools = []
        for server in self.servers.values():
            tools.extend(server.tools)
        return tools

    async def call_tool(self, server_name: str, tool_name: str, args: Dict[str, Any]) -> str:
        server = self.servers.get(server_name)
        if not server:
            return f"Error: MCP server '{server_name}' not found"
        return await server.call_tool(tool_name, args)

    async def call_tool_by_name(self, tool_name: str, args: Dict[str, Any]) -> Optional[str]:
        for server in self.servers.values():
            for t in server.tools:
                if t.name == tool_name:
                    return await server.call_tool(tool_name, args)
        return None
