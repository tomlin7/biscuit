"""
Debug Adapter Protocol (DAP) client implementation.

This module provides a client for communicating with debug adapters
using the Debug Adapter Protocol.
"""

import enum
import typing as t

from pydantic import ValidationError, TypeAdapter

from .protocol import Request, Response, Event, CancelRequest, CancelResponse
from .events import (
    InitializedEvent, StoppedEvent, ContinuedEvent, ExitedEvent, 
    TerminatedEvent, ThreadEvent, OutputEvent, BreakpointEvent,
    ModuleEvent, LoadedSourceEvent, ProcessEvent, CapabilitiesEvent,
    ProgressStartEvent, ProgressUpdateEvent, ProgressEndEvent,
    InvalidatedEvent, MemoryEvent
)
from .requests import *
from .io_handler import _make_request, _make_response, _make_event, _parse_messages
from .types import Capabilities


class ClientState(enum.Enum):
    """Client connection states."""
    NOT_INITIALIZED = enum.auto()
    WAITING_FOR_INITIALIZED = enum.auto()
    NORMAL = enum.auto()
    WAITING_FOR_SHUTDOWN = enum.auto()
    SHUTDOWN = enum.auto()
    EXITED = enum.auto()


class DAPClient:
    """
    A client for communicating with debug adapters using the Debug Adapter Protocol.
    """
    
    def __init__(
        self,
        clientID: t.Optional[str] = None,
        clientName: t.Optional[str] = None,
        adapterID: t.Optional[str] = None,
        locale: t.Optional[str] = None,
        linesStartAt1: bool = True,
        columnsStartAt1: bool = True,
        pathFormat: t.Optional[str] = "path",
        supportsVariableType: bool = False,
        supportsVariablePaging: bool = False,
        supportsRunInTerminalRequest: bool = False,
        supportsMemoryReferences: bool = False,
        supportsProgressReporting: bool = False,
        supportsInvalidatedEvent: bool = False,
        supportsMemoryEvent: bool = False,
    ) -> None:
        self._state = ClientState.NOT_INITIALIZED
        
        # Used to save data as it comes in (from `recv`) until we have a full message
        self._recv_buf = bytearray()        
        # Things that we still need to send
        self._send_buf = bytearray()
        # Keeps track of which sequence numbers match to which unanswered requests
        self._unanswered_requests: t.Dict[int, Request] = {}
        # Sequence number counter
        self._seq_counter = 0
        # Client capabilities
        self._client_capabilities = {
            "supportsVariableType": supportsVariableType,
            "supportsVariablePaging": supportsVariablePaging,
            "supportsRunInTerminalRequest": supportsRunInTerminalRequest,
            "supportsMemoryReferences": supportsMemoryReferences,
            "supportsProgressReporting": supportsProgressReporting,
            "supportsInvalidatedEvent": supportsInvalidatedEvent,
            "supportsMemoryEvent": supportsMemoryEvent,
        }
        # Send initialize request
        self._send_request(
            command="initialize",
            arguments={
                "clientID": clientID,
                "clientName": clientName,
                "adapterID": adapterID,
                "locale": locale,
                "linesStartAt1": linesStartAt1,
                "columnsStartAt1": columnsStartAt1,
                "pathFormat": pathFormat,
                "supportsVariableType": supportsVariableType,
                "supportsVariablePaging": supportsVariablePaging,
                "supportsRunInTerminalRequest": supportsRunInTerminalRequest,
                "supportsMemoryReferences": supportsMemoryReferences,
                "supportsProgressReporting": supportsProgressReporting,
                "supportsInvalidatedEvent": supportsInvalidatedEvent,
                "supportsMemoryEvent": supportsMemoryEvent,
            }
        )
        self._state = ClientState.WAITING_FOR_INITIALIZED

    @property
    def state(self) -> ClientState:
        """Get the current client state."""
        return self._state

    @property
    def is_initialized(self) -> bool:
        """Check if the client is initialized."""
        return (
            self._state != ClientState.NOT_INITIALIZED
            and self._state != ClientState.WAITING_FOR_INITIALIZED
        )

    def _send_request(
        self, 
        command: str, 
        arguments: t.Optional[t.Dict[str, t.Any]] = None
    ) -> int:
        """Send a request to the debug adapter."""
        seq = self._seq_counter
        self._seq_counter += 1
        
        self._send_buf += _make_request(command=command, arguments=arguments, seq=seq)
        self._unanswered_requests[seq] = Request(
            seq=seq, 
            type="request", 
            command=command, 
            arguments=arguments
        )
        return seq

    def _send_response(
        self,
        seq: int,
        request_seq: int,
        command: str,
        success: bool,
        result: t.Optional[t.Dict[str, t.Any]] = None,
        error: t.Optional[t.Dict[str, t.Any]] = None,
        message: t.Optional[str] = None,
    ) -> None:
        """Send a response to the debug adapter."""
        self._send_buf += _make_response(
            seq=seq,
            request_seq=request_seq,
            command=command,
            success=success,
            result=result,
            error=error,
            message=message
        )

    def _send_event(
        self,
        event: str,
        body: t.Optional[t.Dict[str, t.Any]] = None
    ) -> None:
        """Send an event to the debug adapter."""
        seq = self._seq_counter
        self._seq_counter += 1
        self._send_buf += _make_event(event=event, body=body, seq=seq)

    def _handle_response(self, response: Response) -> Event:
        """Handle a response from the debug adapter."""
        assert response.request_seq is not None
        
        # Get the request if it exists
        request = self._unanswered_requests.get(response.request_seq)
        if request:
            self._unanswered_requests.pop(response.request_seq)
        
        if not response.success:
            # Handle error response
            from .protocol import ErrorResponse
            error_response = ErrorResponse.model_validate(response.model_dump())
            return error_response
        
        # Handle successful responses
        if request and request.command == "initialize":
            assert self._state == ClientState.WAITING_FOR_INITIALIZED
            # Send initialized event
            event = InitializedEvent(seq=response.seq, type="event", event="initialized")
            self._state = ClientState.NORMAL
            return event
            
        elif request and request.command == "disconnect":
            assert self._state == ClientState.WAITING_FOR_SHUTDOWN
            event = TerminatedEvent(seq=response.seq, type="event", event="terminated")
            self._state = ClientState.SHUTDOWN
            return event
            
        else:
            # Generic response handling
            event_body = {
                "command": request.command if request else response.command,
                "request_seq": response.request_seq,
                "success": response.success,
                "message": response.message,
                "body": response.body,
            }
            event = Event(seq=response.seq, type="event", event="response", body=event_body)
            return event

    def _handle_request(self, request: Request) -> Event:
        """Handle a request from the debug adapter."""
        # This would typically be handled by the application using the client
        # For now, we'll just return a generic event
        return Event(seq=request.seq, type="event", event="request")

    def recv(self, data: bytes) -> t.Iterator[Event]:
        """Receive data from the debug adapter and yield events."""
        self._recv_buf += data
        
        try:
            for message in _parse_messages(self._recv_buf):
                
                if isinstance(message, Response):
                    yield self._handle_response(message)
                elif isinstance(message, Request):
                    yield self._handle_request(message)
                elif isinstance(message, Event):
                    # Handle events directly - don't process them further
                    yield message
        except Exception:
            # Clear the buffer to prevent further parsing issues
            self._recv_buf.clear()

    def send(self) -> bytes:
        """Get data to send to the debug adapter."""
        send_buf = self._send_buf[:]
        self._send_buf.clear()
        return send_buf

    def disconnect(self) -> None:
        """Disconnect from the debug adapter."""
        assert self._state == ClientState.NORMAL
        self._send_request(command="disconnect")
        self._state = ClientState.WAITING_FOR_SHUTDOWN

    def launch(self, program: str, **kwargs) -> int:
        """Launch a program in the debugger."""
        assert self._state == ClientState.NORMAL
        arguments = {"program": program, **kwargs}
        return self._send_request(command="launch", arguments=arguments)

    def attach(self, **kwargs) -> int:
        """Attach to a running program."""
        assert self._state == ClientState.NORMAL
        return self._send_request(command="attach", arguments=kwargs)

    def set_breakpoints(
        self, 
        source: t.Dict[str, t.Any], 
        breakpoints: t.List[t.Dict[str, t.Any]]
    ) -> int:
        """Set breakpoints for a source."""
        assert self._state == ClientState.NORMAL
        return self._send_request(
            command="setBreakpoints",
            arguments={"source": source, "breakpoints": breakpoints}
        )

    def set_function_breakpoints(self, breakpoints: t.List[t.Dict[str, t.Any]]) -> int:
        """Set function breakpoints."""
        assert self._state == ClientState.NORMAL
        return self._send_request(
            command="setFunctionBreakpoints",
            arguments={"breakpoints": breakpoints}
        )

    def set_exception_breakpoints(self, filters: t.List[str]) -> int:
        """Set exception breakpoints."""
        assert self._state == ClientState.NORMAL
        return self._send_request(
            command="setExceptionBreakpoints",
            arguments={"filters": filters}
        )

    def configuration_done(self) -> int:
        """Indicate that configuration is done."""
        assert self._state == ClientState.NORMAL
        return self._send_request(command="configurationDone")

    def continue_execution(self, threadId: int) -> int:
        """Continue execution."""
        assert self._state == ClientState.NORMAL
        return self._send_request(command="continue", arguments={"threadId": threadId})

    def next(self, threadId: int) -> int:
        """Step to the next line."""
        assert self._state == ClientState.NORMAL
        return self._send_request(command="next", arguments={"threadId": threadId})

    def step_in(self, threadId: int) -> int:
        """Step into the current line."""
        assert self._state == ClientState.NORMAL
        return self._send_request(command="stepIn", arguments={"threadId": threadId})

    def step_out(self, threadId: int) -> int:
        """Step out of the current function."""
        assert self._state == ClientState.NORMAL
        return self._send_request(command="stepOut", arguments={"threadId": threadId})

    def pause(self, threadId: int) -> int:
        """Pause execution."""
        assert self._state == ClientState.NORMAL
        return self._send_request(command="pause", arguments={"threadId": threadId})

    def stack_trace(self, threadId: int, **kwargs) -> int:
        """Get the stack trace."""
        assert self._state == ClientState.NORMAL
        arguments = {"threadId": threadId, **kwargs}
        return self._send_request(command="stackTrace", arguments=arguments)

    def scopes(self, frameId: int) -> int:
        """Get the scopes for a stack frame."""
        assert self._state == ClientState.NORMAL
        return self._send_request(command="scopes", arguments={"frameId": frameId})

    def variables(self, variablesReference: int, **kwargs) -> int:
        """Get variables in a scope."""
        assert self._state == ClientState.NORMAL
        arguments = {"variablesReference": variablesReference, **kwargs}
        return self._send_request(command="variables", arguments=arguments)

    def set_variable(self, variablesReference: int, name: str, value: str) -> int:
        """Set the value of a variable."""
        assert self._state == ClientState.NORMAL
        return self._send_request(
            command="setVariable",
            arguments={
                "variablesReference": variablesReference,
                "name": name,
                "value": value
            }
        )

    def source(self, sourceReference: int) -> int:
        """Get the source code."""
        assert self._state == ClientState.NORMAL
        return self._send_request(command="source", arguments={"sourceReference": sourceReference})

    def threads(self) -> int:
        """Get all threads."""
        assert self._state == ClientState.NORMAL
        return self._send_request(command="threads")

    def evaluate(self, expression: str, frameId: t.Optional[int] = None, **kwargs) -> int:
        """Evaluate an expression."""
        assert self._state == ClientState.NORMAL
        arguments = {"expression": expression, **kwargs}
        if frameId is not None:
            arguments["frameId"] = frameId
        return self._send_request(command="evaluate", arguments=arguments)

    def cancel(self, requestId: t.Optional[int] = None, progressId: t.Optional[str] = None) -> int:
        """Cancel a request or progress."""
        arguments = {}
        if requestId is not None:
            arguments["requestId"] = requestId
        if progressId is not None:
            arguments["progressId"] = progressId
        return self._send_request(command="cancel", arguments=arguments)