"""Debug Adapter Protocol (DAP) request types."""

import typing as t
from typing_extensions import Literal
from pydantic import BaseModel

from .protocol import Request


class InitializeRequest(Request):
    """Initialize the debug adapter."""
    command: Literal['initialize'] = 'initialize'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class ConfigurationDoneRequest(Request):
    """Indicate that configuration is done."""
    command: Literal['configurationDone'] = 'configurationDone'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class LaunchRequest(Request):
    """Launch a program in the debugger."""
    command: Literal['launch'] = 'launch'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class AttachRequest(Request):
    """Attach to a running program."""
    command: Literal['attach'] = 'attach'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class DisconnectRequest(Request):
    """Disconnect from the debugger."""
    command: Literal['disconnect'] = 'disconnect'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class TerminateRequest(Request):
    """Terminate the debuggee."""
    command: Literal['terminate'] = 'terminate'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class RestartRequest(Request):
    """Restart the debuggee."""
    command: Literal['restart'] = 'restart'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class SetBreakpointsRequest(Request):
    """Set breakpoints for a source."""
    command: Literal['setBreakpoints'] = 'setBreakpoints'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class SetFunctionBreakpointsRequest(Request):
    """Set function breakpoints."""
    command: Literal['setFunctionBreakpoints'] = 'setFunctionBreakpoints'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class SetExceptionBreakpointsRequest(Request):
    """Set exception breakpoints."""
    command: Literal['setExceptionBreakpoints'] = 'setExceptionBreakpoints'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class SetDataBreakpointsRequest(Request):
    """Set data breakpoints."""
    command: Literal['setDataBreakpoints'] = 'setDataBreakpoints'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class SetInstructionBreakpointsRequest(Request):
    """Set instruction breakpoints."""
    command: Literal['setInstructionBreakpoints'] = 'setInstructionBreakpoints'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class ContinueRequest(Request):
    """Continue execution."""
    command: Literal['continue'] = 'continue'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class NextRequest(Request):
    """Step to the next line."""
    command: Literal['next'] = 'next'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class StepInRequest(Request):
    """Step into the current line."""
    command: Literal['stepIn'] = 'stepIn'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class StepOutRequest(Request):
    """Step out of the current function."""
    command: Literal['stepOut'] = 'stepOut'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class StepBackRequest(Request):
    """Step back to the previous line."""
    command: Literal['stepBack'] = 'stepBack'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class ReverseContinueRequest(Request):
    """Continue execution in reverse."""
    command: Literal['reverseContinue'] = 'reverseContinue'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class RestartFrameRequest(Request):
    """Restart the current stack frame."""
    command: Literal['restartFrame'] = 'restartFrame'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class GotoRequest(Request):
    """Go to a specific location."""
    command: Literal['goto'] = 'goto'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class PauseRequest(Request):
    """Pause execution."""
    command: Literal['pause'] = 'pause'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class StackTraceRequest(Request):
    """Get the stack trace."""
    command: Literal['stackTrace'] = 'stackTrace'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class ScopesRequest(Request):
    """Get the scopes for a stack frame."""
    command: Literal['scopes'] = 'scopes'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class VariablesRequest(Request):
    """Get variables in a scope."""
    command: Literal['variables'] = 'variables'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class SetVariableRequest(Request):
    """Set the value of a variable."""
    command: Literal['setVariable'] = 'setVariable'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class SourceRequest(Request):
    """Get the source code."""
    command: Literal['source'] = 'source'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class ThreadsRequest(Request):
    """Get all threads."""
    command: Literal['threads'] = 'threads'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class TerminateThreadsRequest(Request):
    """Terminate specific threads."""
    command: Literal['terminateThreads'] = 'terminateThreads'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class ModulesRequest(Request):
    """Get all modules."""
    command: Literal['modules'] = 'modules'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class LoadedSourcesRequest(Request):
    """Get all loaded sources."""
    command: Literal['loadedSources'] = 'loadedSources'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class EvaluateRequest(Request):
    """Evaluate an expression."""
    command: Literal['evaluate'] = 'evaluate'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class SetExpressionRequest(Request):
    """Set the value of an expression."""
    command: Literal['setExpression'] = 'setExpression'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class StepInTargetsRequest(Request):
    """Get step-in targets."""
    command: Literal['stepInTargets'] = 'stepInTargets'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class GotoTargetsRequest(Request):
    """Get goto targets."""
    command: Literal['gotoTargets'] = 'gotoTargets'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class CompletionsRequest(Request):
    """Get completions."""
    command: Literal['completions'] = 'completions'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class ExceptionInfoRequest(Request):
    """Get exception information."""
    command: Literal['exceptionInfo'] = 'exceptionInfo'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class ReadMemoryRequest(Request):
    """Read memory."""
    command: Literal['readMemory'] = 'readMemory'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class WriteMemoryRequest(Request):
    """Write memory."""
    command: Literal['writeMemory'] = 'writeMemory'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class DisassembleRequest(Request):
    """Disassemble code."""
    command: Literal['disassemble'] = 'disassemble'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class DataBreakpointInfoRequest(Request):
    """Get data breakpoint information."""
    command: Literal['dataBreakpointInfo'] = 'dataBreakpointInfo'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class BreakpointLocationsRequest(Request):
    """Get breakpoint locations."""
    command: Literal['breakpointLocations'] = 'breakpointLocations'
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class LocationsRequest(Request):
    """Get locations."""
    command: Literal['locations'] = 'locations'
    arguments: t.Optional[t.Dict[str, t.Any]] = None
