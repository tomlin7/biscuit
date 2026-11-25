from __future__ import annotations

import queue
from typing import Any, Callable, List, Optional


class TerminalCommandQueue:
    """Manages command queuing and buffering for terminal execution."""

    def __init__(self, executor: Optional[Callable[[str], None]] = None):
        self.queue: queue.Queue[str] = queue.Queue()
        self.executor = executor
        self.is_ready: bool = True

    def put(self, command: str) -> None:
        if not command:
            return
        self.queue.put(command)
        if self.is_ready:
            self.flush()

    def set_ready(self, ready: bool) -> None:
        self.is_ready = ready
        if self.is_ready:
            self.flush()

    def flush(self) -> List[str]:
        executed = []
        while not self.queue.empty():
            cmd = self.queue.get()
            executed.append(cmd)
            if self.executor:
                self.executor(cmd)
        return executed

    def clear(self) -> None:
        while not self.queue.empty():
            self.queue.get_nowait()

    @property
    def pending_count(self) -> int:
        return self.queue.qsize()
