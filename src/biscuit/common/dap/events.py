"""Debug Adapter Protocol (DAP) event types."""

import typing as t
from typing_extensions import Literal
from pydantic import BaseModel

from .protocol import Event


class InitializedEvent(Event):
    """Debug adapter is ready to accept configuration requests."""
    event: Literal['initialized'] = 'initialized'


class StoppedEvent(Event):
    """Execution of the debuggee has stopped."""
    event: Literal['stopped'] = 'stopped'
    body: t.Optional[t.Dict[str, t.Any]] = None


class ContinuedEvent(Event):
    """Execution of the debuggee has continued."""
    event: Literal['continued'] = 'continued'
    body: t.Optional[t.Dict[str, t.Any]] = None


class ExitedEvent(Event):
    """Debuggee has exited."""
    event: Literal['exited'] = 'exited'
    body: t.Optional[t.Dict[str, t.Any]] = None


class TerminatedEvent(Event):
    """Debugging has terminated."""
    event: Literal['terminated'] = 'terminated'
    body: t.Optional[t.Dict[str, t.Any]] = None


class ThreadEvent(Event):
    """A thread has started or exited."""
    event: Literal['thread'] = 'thread'
    body: t.Optional[t.Dict[str, t.Any]] = None


class OutputEvent(Event):
    """Target has produced some output."""
    event: Literal['output'] = 'output'
    body: t.Optional[t.Dict[str, t.Any]] = None


class BreakpointEvent(Event):
    """Information about a breakpoint has changed."""
    event: Literal['breakpoint'] = 'breakpoint'
    body: t.Optional[t.Dict[str, t.Any]] = None


class ModuleEvent(Event):
    """Information about a module has changed."""
    event: Literal['module'] = 'module'
    body: t.Optional[t.Dict[str, t.Any]] = None


class LoadedSourceEvent(Event):
    """Source has been added, changed, or removed."""
    event: Literal['loadedSource'] = 'loadedSource'
    body: t.Optional[t.Dict[str, t.Any]] = None


class ProcessEvent(Event):
    """Debugger has begun debugging a new process."""
    event: Literal['process'] = 'process'
    body: t.Optional[t.Dict[str, t.Any]] = None


class CapabilitiesEvent(Event):
    """Capabilities of the debug adapter have changed."""
    event: Literal['capabilities'] = 'capabilities'
    body: t.Optional[t.Dict[str, t.Any]] = None


class ProgressStartEvent(Event):
    """Long running operation is about to start."""
    event: Literal['progressStart'] = 'progressStart'
    body: t.Optional[t.Dict[str, t.Any]] = None


class ProgressUpdateEvent(Event):
    """Progress reporting needs to be updated."""
    event: Literal['progressUpdate'] = 'progressUpdate'
    body: t.Optional[t.Dict[str, t.Any]] = None


class ProgressEndEvent(Event):
    """Progress reporting has ended."""
    event: Literal['progressEnd'] = 'progressEnd'
    body: t.Optional[t.Dict[str, t.Any]] = None


class InvalidatedEvent(Event):
    """State in the debug adapter has changed."""
    event: Literal['invalidated'] = 'invalidated'
    body: t.Optional[t.Dict[str, t.Any]] = None


class MemoryEvent(Event):
    """Memory range has been updated."""
    event: Literal['memory'] = 'memory'
    body: t.Optional[t.Dict[str, t.Any]] = None