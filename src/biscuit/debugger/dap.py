from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import typing

from .base import DebuggerBase

if typing.TYPE_CHECKING:
    from .manager import DebuggerManager


class DAPProtocol:
    """Sans-IO Debug Adapter Protocol parser and serializer."""

    HEADER_CONTENT_LENGTH = "Content-Length: "
    HEADER_SEPARATOR = b"\r\n\r\n"

    def __init__(self) -> None:
        self.buffer = bytearray()
        self.seq = 0

    def feed_data(self, data: bytes | str) -> list[dict[str, typing.Any]]:
        """Feed incoming bytes or string and parse complete DAP messages."""
        if isinstance(data, str):
            data = data.encode("utf-8")
        self.buffer.extend(data)

        messages: list[dict[str, typing.Any]] = []
        while True:
            sep_idx = self.buffer.find(self.HEADER_SEPARATOR)
            if sep_idx == -1:
                break

            header_bytes = self.buffer[:sep_idx]
            header_text = header_bytes.decode("ascii", errors="replace")

            content_length = None
            for line in header_text.split("\r\n"):
                if line.lower().startswith("content-length:"):
                    try:
                        content_length = int(line.split(":", 1)[1].strip())
                    except ValueError:
                        pass
                    break

            if content_length is None:
                # Discard malformed header up to separator
                del self.buffer[: sep_idx + len(self.HEADER_SEPARATOR)]
                continue

            content_start = sep_idx + len(self.HEADER_SEPARATOR)
            content_end = content_start + content_length

            if len(self.buffer) < content_end:
                # Full payload hasn't arrived yet
                break

            body_bytes = self.buffer[content_start:content_end]
            del self.buffer[:content_end]

            try:
                msg = json.loads(body_bytes.decode("utf-8"))
                messages.append(msg)
            except Exception:
                continue

        return messages

    def next_seq(self) -> int:
        self.seq += 1
        return self.seq

    def build_request(
        self, command: str, arguments: dict[str, typing.Any] | None = None
    ) -> bytes:
        payload = {
            "seq": self.next_seq(),
            "type": "request",
            "command": command,
            "arguments": arguments or {},
        }
        return self._encode(payload)

    def build_response(
        self,
        request_seq: int,
        command: str,
        success: bool = True,
        body: dict[str, typing.Any] | None = None,
        message: str | None = None,
    ) -> bytes:
        payload: dict[str, typing.Any] = {
            "seq": self.next_seq(),
            "type": "response",
            "request_seq": request_seq,
            "command": command,
            "success": success,
        }
        if body is not None:
            payload["body"] = body
        if message is not None:
            payload["message"] = message
        return self._encode(payload)

    def build_event(
        self, event: str, body: dict[str, typing.Any] | None = None
    ) -> bytes:
        payload: dict[str, typing.Any] = {
            "seq": self.next_seq(),
            "type": "event",
            "event": event,
        }
        if body is not None:
            payload["body"] = body
        return self._encode(payload)

    def _encode(self, payload: dict[str, typing.Any]) -> bytes:
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        header = f"Content-Length: {len(body)}\r\n\r\n".encode("ascii")
        return header + body


class DAPDebugger(DebuggerBase):
    """Debug Adapter Protocol (DAP) client implementation subclassing DebuggerBase."""

    def __init__(self, manager: DebuggerManager):
        super().__init__(manager)
        self.protocol = DAPProtocol()
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

    def launch_config(self, config: dict[str, typing.Any]) -> None:
        self.manager.latest = self
        self.program_path = self.format_path(config.get("program", ""))
        self.cwd = self.format_path(config.get("cwd", ""))

        adapter = config.get("adapter")
        if isinstance(adapter, list):
            self.adapter_command = adapter
        elif isinstance(adapter, str):
            self.adapter_command = [adapter]
        else:
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

        try:
            self.process = subprocess.Popen(
                self.adapter_command,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=self.cwd or None,
                bufsize=0,
            )
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

        self.send_request(
            "initialize",
            {
                "clientID": "biscuit",
                "clientName": "Biscuit Code Editor",
                "adapterID": "dap",
                "linesStartAt1": True,
                "columnsStartAt1": True,
                "pathFormat": "path",
            },
        )

    def _read_stream(self) -> None:
        while self.is_running and self.process and self.process.stdout:
            try:
                chunk = self.process.stdout.read(4096)
                if not chunk:
                    break
                messages = self.protocol.feed_data(chunk)
                for msg in messages:
                    self.handle_message(msg)
            except Exception:
                break
        self._on_adapter_exit()

    def send_request(
        self, command: str, arguments: dict[str, typing.Any] | None = None
    ) -> int:
        req_bytes = self.protocol.build_request(command, arguments)
        seq = self.protocol.seq
        self.pending_requests[seq] = command

        if self.process and self.process.stdin:
            try:
                self.process.stdin.write(req_bytes)
                self.process.stdin.flush()
            except Exception:
                pass
        return seq

    def handle_message(self, msg: dict[str, typing.Any]) -> None:
        msg_type = msg.get("type")
        if msg_type == "event":
            self.handle_event(msg.get("event", ""), msg.get("body", {}))
        elif msg_type == "response":
            req_seq = msg.get("request_seq")
            cmd = self.pending_requests.pop(req_seq, msg.get("command", ""))
            self.handle_response(cmd, msg)

    def handle_event(self, event: str, body: dict[str, typing.Any]) -> None:
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
        self, command: str, msg: dict[str, typing.Any]
    ) -> None:
        if not msg.get("success", False):
            return

        body = msg.get("body", {})
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
            if hasattr(self, "variables") and self.variables:
                self.variables.show("Locals", vars_dict, open_=True)

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
