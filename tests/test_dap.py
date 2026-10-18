import json
from unittest.mock import MagicMock

from biscuit.debugger.dap import DAPDebugger, DAPProtocol
from biscuit.debugger.manager import DebuggerManager


class TestDAPProtocol:
    def test_build_request(self):
        proto = DAPProtocol()
        req_bytes = proto.build_request("initialize", {"clientID": "biscuit"})
        assert req_bytes.startswith(b"Content-Length: ")
        assert b"\r\n\r\n" in req_bytes
        header, body = req_bytes.split(b"\r\n\r\n", 1)
        length = int(header.decode().split(": ")[1])
        assert len(body) == length

        data = json.loads(body.decode())
        assert data["seq"] == 1
        assert data["type"] == "request"
        assert data["command"] == "initialize"
        assert data["arguments"]["clientID"] == "biscuit"

    def test_build_response(self):
        proto = DAPProtocol()
        resp_bytes = proto.build_response(
            request_seq=1, command="initialize", success=True, body={"supportsConfigurationDone": True}
        )
        header, body = resp_bytes.split(b"\r\n\r\n", 1)
        data = json.loads(body.decode())
        assert data["type"] == "response"
        assert data["request_seq"] == 1
        assert data["command"] == "initialize"
        assert data["success"] is True
        assert data["body"]["supportsConfigurationDone"] is True

    def test_build_event(self):
        proto = DAPProtocol()
        evt_bytes = proto.build_event("stopped", {"reason": "breakpoint", "threadId": 1})
        header, body = evt_bytes.split(b"\r\n\r\n", 1)
        data = json.loads(body.decode())
        assert data["type"] == "event"
        assert data["event"] == "stopped"
        assert data["body"]["reason"] == "breakpoint"

    def test_feed_data_complete(self):
        proto = DAPProtocol()
        req_bytes = proto.build_request("next", {"threadId": 1})
        messages = proto.feed_data(req_bytes)
        assert len(messages) == 1
        assert messages[0]["command"] == "next"

    def test_feed_data_fragmented(self):
        proto = DAPProtocol()
        req_bytes = proto.build_request("pause", {"threadId": 2})

        # Feed byte by byte
        messages = []
        for b in req_bytes:
            messages.extend(proto.feed_data(bytes([b])))

        assert len(messages) == 1
        assert messages[0]["command"] == "pause"
        assert messages[0]["arguments"]["threadId"] == 2

    def test_feed_data_multiple(self):
        proto = DAPProtocol()
        req1 = proto.build_request("stepIn", {"threadId": 1})
        req2 = proto.build_request("stepOut", {"threadId": 1})

        messages = proto.feed_data(req1 + req2)
        assert len(messages) == 2
        assert messages[0]["command"] == "stepIn"
        assert messages[1]["command"] == "stepOut"


class TestDAPDebugger:
    def test_init_and_registration(self):
        mock_base = MagicMock()
        mock_base.secondary_sidebar.debug.variables = MagicMock()
        mock_base.secondary_sidebar.debug.callstack = MagicMock()
        manager = DebuggerManager(mock_base)

        assert "dap" in manager.debuggers
        assert manager.debuggers["dap"] == DAPDebugger

        debugger = manager.request_debugger("dap")
        assert isinstance(debugger, DAPDebugger)

    def test_handle_event_initialized(self):
        mock_base = MagicMock()
        mock_base.secondary_sidebar.debug.variables = MagicMock()
        mock_base.secondary_sidebar.debug.callstack = MagicMock()
        manager = DebuggerManager(mock_base)
        debugger = DAPDebugger(manager)
        debugger.send_request = MagicMock()
        debugger.breakpoints = {"main.py": {10, 20}}
        debugger.program_path = "main.py"
        debugger.cwd = "."

        debugger.handle_event("initialized", {})

        # Should have sent setBreakpoints, configurationDone, launch
        commands_sent = [call.args[0] for call in debugger.send_request.call_args_list]
        assert "setBreakpoints" in commands_sent
        assert "configurationDone" in commands_sent
        assert "launch" in commands_sent

    def test_handle_event_stopped_and_stacktrace(self):
        mock_base = MagicMock()
        mock_callstack = MagicMock()
        mock_variables = MagicMock()
        mock_base.secondary_sidebar.debug.callstack = mock_callstack
        mock_base.secondary_sidebar.debug.variables = mock_variables
        manager = DebuggerManager(mock_base)
        debugger = DAPDebugger(manager)
        debugger.send_request = MagicMock()

        debugger.handle_event("stopped", {"reason": "breakpoint", "threadId": 3})
        assert debugger.is_paused is True
        assert debugger.current_thread_id == 3
        debugger.send_request.assert_called_with("stackTrace", {"threadId": 3})

        # Test stackTrace response handling
        debugger.callstack = mock_callstack
        debugger.variables = mock_variables
        debugger.handle_response(
            "stackTrace",
            {
                "success": True,
                "body": {
                    "stackFrames": [
                        {
                            "id": 100,
                            "name": "my_function",
                            "source": {"path": "/path/to/main.py"},
                            "line": 42,
                        }
                    ]
                },
            },
        )
        mock_callstack.show.assert_called_once_with([("my_function", "/path/to/main.py", 42)])
        assert debugger.current_frame_id == 100

    def test_dap_client_integration(self):
        mock_base = MagicMock()
        mock_base.secondary_sidebar.debug.variables = MagicMock()
        mock_base.secondary_sidebar.debug.callstack = MagicMock()
        manager = DebuggerManager(mock_base)
        debugger = DAPDebugger(manager)

        # Check client integration
        assert debugger.client is not None
        # Send request through DAPClient
        seq = debugger.send_request("next", {"threadId": 1})
        assert seq == 1
        assert debugger.pending_requests[seq] == "next"

    def test_handle_client_event_event_and_response(self):
        mock_base = MagicMock()
        mock_base.secondary_sidebar.debug.variables = MagicMock()
        mock_base.secondary_sidebar.debug.callstack = MagicMock()
        manager = DebuggerManager(mock_base)
        debugger = DAPDebugger(manager)
        debugger.handle_event = MagicMock()
        debugger.handle_response = MagicMock()

        try:
            from dap.protocol import Event
        except ImportError:
            from biscuit.common.dap.protocol import Event

        # Test event dispatch
        evt = Event(seq=1, type="event", event="stopped", body={"threadId": 2})
        debugger.handle_client_event(evt)
        debugger.handle_event.assert_called_once_with("stopped", {"threadId": 2})

        # Test response dispatch
        resp_evt = Event(
            seq=2,
            type="event",
            event="response",
            body={"command": "stackTrace", "success": True, "body": {}},
        )
        debugger.handle_client_event(resp_evt)
        debugger.handle_response.assert_called_once_with("stackTrace", resp_evt.body)

    def test_stepping_and_continue_pause(self):
        mock_base = MagicMock()
        mock_base.secondary_sidebar.debug.variables = MagicMock()
        mock_base.secondary_sidebar.debug.callstack = MagicMock()
        manager = DebuggerManager(mock_base)
        debugger = DAPDebugger(manager)
        debugger.send_request = MagicMock()

        # When paused
        debugger.is_paused = True
        debugger.current_thread_id = 5

        debugger.step_in()
        debugger.send_request.assert_called_with("stepIn", {"threadId": 5})

        debugger.step_over()
        debugger.send_request.assert_called_with("next", {"threadId": 5})

        debugger.step_out()
        debugger.send_request.assert_called_with("stepOut", {"threadId": 5})

        debugger.continue_pause()
        debugger.send_request.assert_called_with("continue", {"threadId": 5})
        assert debugger.is_paused is False

        debugger.continue_pause()
        debugger.send_request.assert_called_with("pause", {"threadId": 5})

    def test_evaluate_and_variable(self):
        mock_base = MagicMock()
        mock_base.secondary_sidebar.debug.variables = MagicMock()
        mock_base.secondary_sidebar.debug.callstack = MagicMock()
        manager = DebuggerManager(mock_base)
        debugger = DAPDebugger(manager)
        debugger.send_request = MagicMock()

        debugger.current_variables_ref = 42
        debugger.set_variable("foo", "bar")
        debugger.send_request.assert_called_with(
            "setVariable", {"variablesReference": 42, "name": "foo", "value": "bar"}
        )

        debugger.current_frame_id = 7
        debugger.evaluate("x + 1")
        debugger.send_request.assert_called_with(
            "evaluate", {"expression": "x + 1", "frameId": 7}
        )

    def test_register_dap_adapter(self):
        mock_base = MagicMock()
        manager = DebuggerManager(mock_base)

        manager.register_dap_adapter("rust", ["lldb-dap", "--port", "1234"])
        assert "rust" in manager.debuggers

        rust_debugger = manager.request_debugger("rust")
        assert isinstance(rust_debugger, DAPDebugger)
        assert rust_debugger.adapter_command == ["lldb-dap", "--port", "1234"]

    def test_python_debugger_is_dap(self):
        from biscuit.debugger.python import PythonDebugger
        mock_base = MagicMock()
        manager = DebuggerManager(mock_base)

        py_dbg = manager.request_debugger("python")
        assert isinstance(py_dbg, DAPDebugger)
        assert isinstance(py_dbg, PythonDebugger)
        assert "debugpy.adapter" in " ".join(py_dbg.adapter_command)
