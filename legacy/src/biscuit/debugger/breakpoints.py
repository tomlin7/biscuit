from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional, Set


@dataclass
class Breakpoint:
    line: int
    condition: Optional[str] = None
    hit_condition: Optional[int] = None
    hits: int = 0

    def should_pause(self, scope: Optional[Dict[str, Any]] = None) -> bool:
        self.hits += 1

        if self.hit_condition is not None and self.hits < self.hit_condition:
            return False

        if self.condition:
            try:
                # Safe evaluation in restricted scope
                eval_scope = scope if scope is not None else {}
                return bool(eval(self.condition, {"__builtins__": {}}, eval_scope))
            except Exception:
                return False

        return True


class BreakpointManager:
    """Manages normal, conditional, and hit-count breakpoints across files."""

    def __init__(self):
        self.breakpoints: Dict[str, Dict[int, Breakpoint]] = {}

    def set_breakpoint(
        self, file_path: str, line: int, condition: Optional[str] = None, hit_condition: Optional[int] = None
    ) -> Breakpoint:
        if file_path not in self.breakpoints:
            self.breakpoints[file_path] = {}

        bp = Breakpoint(line=line, condition=condition, hit_condition=hit_condition)
        self.breakpoints[file_path][line] = bp
        return bp

    def remove_breakpoint(self, file_path: str, line: int) -> Optional[Breakpoint]:
        if file_path in self.breakpoints:
            return self.breakpoints[file_path].pop(line, None)
        return None

    def get_breakpoint(self, file_path: str, line: int) -> Optional[Breakpoint]:
        return self.breakpoints.get(file_path, {}).get(line)

    def get_lines(self, file_path: str) -> Set[int]:
        return set(self.breakpoints.get(file_path, {}).keys())

    def should_pause_at(self, file_path: str, line: int, scope: Optional[Dict[str, Any]] = None) -> bool:
        bp = self.get_breakpoint(file_path, line)
        if not bp:
            return False
        return bp.should_pause(scope)
