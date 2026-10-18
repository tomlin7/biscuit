from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import typing
from typing import Any

try:
    from dap.client import ClientState, DAPClient
    from dap.events import (
        BreakpointEvent,
        ContinuedEvent,
        ExitedEvent,
        InitializedEvent,
        LoadedSourceEvent,
        ModuleEvent,
        OutputEvent,
        ProcessEvent,
        StoppedEvent,
        TerminatedEvent,
        ThreadEvent,
    )
    from dap.io_handler import _make_event, _make_request, _make_response, _parse_messages
    from dap.protocol import ErrorResponse, Event, Request, Response
except ImportError:
    from biscuit.common.dap.client import ClientState, DAPClient
    from biscuit.common.dap.events import (
        BreakpointEvent,
        ContinuedEvent,
        ExitedEvent,
        InitializedEvent,
        LoadedSourceEvent,
        ModuleEvent,
        OutputEvent,
        ProcessEvent,
        StoppedEvent,
        TerminatedEvent,
        ThreadEvent,
    )
    from biscuit.common.dap.io_handler import (
        _make_event,
        _make_request,
        _make_response,
        _parse_messages,
    )
    from biscuit.common.dap.protocol import ErrorResponse, Event, Request, Response

from .base import DebuggerBase

if typing.TYPE_CHECKING:
    from .manager import DebuggerManager


class DAPProtocol:
    """Debug Adapter Protocol parser and serializer backed by debug-adapter-client."""

    HEADER_CONTENT_LENGTH = "Content-Length: "
    HEADER_SEPARATOR = b"\r\n\r\n"

    def __init__(self) -> None:
        self.buffer = bytearray()
        self.seq = 0

    def next_seq(self) -> int:
        self.seq += 1
        return self.seq

    def feed_data(self, data: bytes | str) -> list[dict[str, Any]]:
        """Feed incoming bytes or string and parse complete DAP messages."""
        if isinstance(data, str):
            data = data.encode("utf-8")
        self.buffer.extend(data)

        messages: list[dict[str, Any]] = []
        try:
            for msg in _parse_messages(self.buffer):
                if hasattr(msg, "model_dump"):
                    messages.append(msg.model_dump())
                elif isinstance(msg, dict):
                    messages.append(msg)
        except Exception:
            self.buffer.clear()

        return messages

    def build_request(
        self, command: str, arguments: dict[str, Any] | None = None
    ) -> bytes:
        return bytes(
            _make_request(command=command, arguments=arguments, seq=self.next_seq())
        )

    def build_response(
        self,
        request_seq: int,
        command: str,
        success: bool = True,
        body: dict[str, Any] | None = None,
        message: str | None = None,
    ) -> bytes:
        return bytes(
            _make_response(
                seq=self.next_seq(),
                request_seq=request_seq,
                command=command,
                success=success,
                result=body,
                message=message,
            )
        )

    def build_event(
        self, event: str, body: dict[str, Any] | None = None
    ) -> bytes:
        return bytes(_make_event(event=event, body=body, seq=self.next_seq()))


class DAPDebugger(DebuggerBase):
    """Debug Adapter Protocol (DAP) client implementation subclassing DebuggerBase.
    Powered by debug-adapter-client (dap-python).
    """

    def __init__(self, manager: DebuggerManager):
        super().__init__(manager)
        self.protocol = DAPProtocol()
        self.client: DAPClient = self._create_client()
        self.process: subprocess.Popen | None = None
        self.reader_thread: threading.Thread | None = None
        self.is_running = False
        self.is_paused = False
        self.current_thread_id: int | None = 1
        self.current_frame_id: int | None = None
        self.current_variables_ref: int | None = None
        self.pending_requests: dict[int, str] = {}  # seq -> command name
        self.program_path: str = ""
        self.cwd: str = ""
        self.adapter_command: list[str] = []

    def _create_client(self) -> DAPClient:
        return DAPClient(
            clientID="biscuit",
            clientName="Biscuit Code Editor",
            adapterID="dap",
            linesStartAt1=True,
            columnsStartAt1=True,
            pathFormat="path",
            supportsVariableType=True,
            supportsProgressReporting=True,
        )

    def launch_config(self, config: dict[str, Any]) -> None:
        self.manager.latest = self
        self.program_path = self.format_path(config.get("program", ""))
        self.cwd = self.format_path(config.get("cwd", ""))

        adapter = config.get("adapter")
        if isinstance(adapter, list):
            self.adapter_command = adapter
        elif isinstance(adapter, str):
            self.adapter_command = [adapter]
        elif not self.adapter_command:
            self.adapter_command = [sys.executable, "-m", "debugpy.adapter"]

        self._start_adapter()

    def launch(self, path: str, cwd: str = None) -> None:
        self.manager.latest = self
        self.program_path = path
        self.cwd = cwd or os.path.dirname(os.path.abspath(path))
        if not self.adapter_command:
            self.adapter_command = [sys.executable, "-m", "debugpy.adapter"]
        self._start_adapter()

    def _start_adapter(self) -> None:
        self.stop()
        if hasattr(self.base, "sidebar"):
            self.base.sidebar.show_debug()
        if hasattr(self.base, "debug"):
            self.base.debug.refresh()
            self.base.debug.reset()
            self.base.debug.set_running()

        self.is_running = True
        self.is_paused = False
        self.client = self._create_client()
        self.pending_requests.clear()

        try:
            self.process = subprocess.Popen(
                self.adapter_command,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=self.cwd or None,
                bufsize=0,
            )
            # Send initial initialize request buffered by DAPClient
            init_bytes = self.client.send()
            if init_bytes and self.process.stdin:
                self.process.stdin.write(init_bytes)
                self.process.stdin.flush()

            self.reader_thread = threading.Thread(
                target=self._read_stream,
                name="DAP Reader Thread",
                daemon=True,
            )
            self.reader_thread.start()
        except Exception as e:
            if hasattr(self.base, "logger"):
                self.base.logger.error(f"Failed to start DAP adapter: {e}")
            self.stop()
            return

    def _read_stream(self) -> None:
        while self.is_running and self.process and self.process.stdout:
            try:
                chunk = self.process.stdout.read(4096)
                if not chunk:
                    break
                for event in self.client.recv(chunk):
                    self.handle_client_event(event)
            except Exception:
                break
        self._on_adapter_exit()

    def handle_client_event(self, event: Any) -> None:
        if isinstance(event, Event):
            if event.event == "response":
                body = event.body or {}
                cmd = body.get("command", "")
                self.handle_response(cmd, body)
            else:
                self.handle_event(event.event, event.body or {})
        elif isinstance(event, Response):
            self.handle_response(event.command, event.model_dump())

    def send_request(
        self, command: str, arguments: dict[str, Any] | None = None
    ) -> int:
        arguments = arguments or {}
        if (
            self.client.state == ClientState.WAITING_FOR_INITIALIZED
            and command != "initialize"
        ):
            self.client._state = ClientState.NORMAL

        seq = self.client._send_request(command, arguments)
        self.pending_requests[seq] = command

        if self.process and self.process.stdin:
            try:
                data = self.client.send()
                if data:
                    self.process.stdin.write(data)
                    self.process.stdin.flush()
            except Exception:
                pass
        return seq

    def handle_event(self, event: str, body: dict[str, Any]) -> None:
        if event == "initialized":
            # Send breakpoints
            for path, lines in self.breakpoints.items():
                self.send_request(
                    "setBreakpoints",
                    {
                        "source": {"path": path},
                        "breakpoints": [{"line": line} for line in lines],
                    },
                )
            self.send_request("configurationDone")
            self.send_request(
                "launch",
                {
                    "program": self.program_path,
                    "cwd": self.cwd,
                    "stopOnEntry": False,
                },
            )

        elif event == "stopped":
            self.is_paused = True
            if "threadId" in body:
                self.current_thread_id = body["threadId"]
            if hasattr(self.base, "debug"):
                self.base.debug.set_paused()
            self.send_request(
                "stackTrace", {"threadId": self.current_thread_id or 1}
            )

        elif event == "continued":
            self.is_paused = False
            if hasattr(self.base, "debug"):
                self.base.debug.reset()
                self.base.debug.set_running()

        elif event in ("terminated", "exited"):
            self.stop()

        elif event == "output":
            output_text = body.get("output", "")
            if hasattr(self.base, "logger"):
                self.base.logger.info(f"[DAP output] {output_text.strip()}")

    def handle_response(
        self, command: str, msg: dict[str, Any]
    ) -> None:
        if not msg.get("success", False):
            return

        body = msg.get("body", {}) or {}
        if command == "stackTrace":
            frames = body.get("stackFrames", [])
            stack = []
            for f in frames:
                name = f.get("name", "<unknown>")
                source = f.get("source", {})
                path = source.get("path", "") if isinstance(source, dict) else ""
                line = f.get("line", 1)
                stack.append((name, path, line))
            if hasattr(self, "callstack") and self.callstack:
                self.callstack.show(stack)

            if frames:
                self.current_frame_id = frames[0].get("id")
                self.send_request("scopes", {"frameId": self.current_frame_id})

        elif command == "scopes":
            scopes = body.get("scopes", [])
            for scope in scopes:
                ref = scope.get("variablesReference")
                if ref:
                    self.current_variables_ref = ref
                    self.send_request(
                        "variables",
                        {"variablesReference": ref, "scopeName": scope.get("name", "Locals")},
                    )

        elif command == "variables":
            var_list = body.get("variables", [])
            vars_dict = {
                var.get("name", ""): var.get("value", "") for var in var_list
            }
            scope_name = msg.get("scopeName") or "Locals"
            if hasattr(self, "variables") and self.variables:
                self.variables.show(scope_name, vars_dict, open_=True)

    def _on_adapter_exit(self) -> None:
        self.is_running = False
        self.is_paused = False
        if hasattr(self.base, "debug"):
            self.base.debug.reset()
            self.base.debug.set_stopped()
            self.base.debug.refresh()

    def update_breakpoints(
        self, file_path: str, line_numbers: set[int]
    ) -> None:
        super().update_breakpoints(file_path, line_numbers)
        if self.is_running:
            self.send_request(
                "setBreakpoints",
                {
                    "source": {"path": file_path},
                    "breakpoints": [{"line": line} for line in line_numbers],
                },
            )

    def stop(self) -> None:
        if self.is_running:
            try:
                self.send_request("disconnect", {"terminateDebuggee": True})
            except Exception:
                pass

        if self.process:
            try:
                self.process.terminate()
                self.process.wait(timeout=1)
            except Exception:
                try:
                    self.process.kill()
                except Exception:
                    pass
            self.process = None

        self._on_adapter_exit()

    def restart(self) -> None:
        self.stop()
        if self.program_path:
            self.launch(self.program_path, self.cwd)

    def step_in(self) -> None:
        if self.is_paused:
            self.send_request("stepIn", {"threadId": self.current_thread_id or 1})

    def step_over(self) -> None:
        if self.is_paused:
            self.send_request("next", {"threadId": self.current_thread_id or 1})

    def step_out(self) -> None:
        if self.is_paused:
            self.send_request("stepOut", {"threadId": self.current_thread_id or 1})

    def continue_pause(self) -> None:
        if self.is_paused:
            self.send_request(
                "continue", {"threadId": self.current_thread_id or 1}
            )
            self.is_paused = False
            if hasattr(self.base, "debug"):
                self.base.debug.reset()
                self.base.debug.set_running()
        else:
            self.send_request("pause", {"threadId": self.current_thread_id or 1})

    def set_variable(self, name: str, value: str) -> None:
        if self.current_variables_ref is not None:
            self.send_request(
                "setVariable",
                {
                    "variablesReference": self.current_variables_ref,
                    "name": name,
                    "value": value,
                },
            )

    def evaluate(self, expression: str, frame_id: int | None = None) -> None:
        frame = frame_id if frame_id is not None else self.current_frame_id
        args: dict[str, Any] = {"expression": expression}
        if frame is not None:
            args["frameId"] = frame
        self.send_request("evaluate", args)
