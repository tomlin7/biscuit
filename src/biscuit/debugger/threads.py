from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class StackFrame:
    id: int
    name: str
    file: str
    line: int


@dataclass
class ThreadInfo:
    id: int
    name: str
    status: str = "paused"
    frames: List[StackFrame] = field(default_factory=list)


class ThreadCallStackManager:
    """Manages multi-threaded process call stack inspection in debugger."""

    def __init__(self):
        self.threads: Dict[int, ThreadInfo] = {}
        self.active_thread_id: Optional[int] = None

    def update_threads(self, thread_list: List[ThreadInfo]) -> None:
        self.threads = {t.id: t for t in thread_list}
        if self.threads:
            if self.active_thread_id not in self.threads:
                self.active_thread_id = next(iter(self.threads.keys()))
        else:
            self.active_thread_id = None

    def select_thread(self, thread_id: int) -> Optional[ThreadInfo]:
        if thread_id in self.threads:
            self.active_thread_id = thread_id
            return self.threads[thread_id]
        return None

    def get_active_thread(self) -> Optional[ThreadInfo]:
        if self.active_thread_id is not None:
            return self.threads.get(self.active_thread_id)
        return None

    def get_active_frames(self) -> List[StackFrame]:
        thread = self.get_active_thread()
        return thread.frames if thread else []
