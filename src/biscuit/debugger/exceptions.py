from __future__ import annotations

from enum import Enum
from typing import List


class ExceptionBreakMode(str, Enum):
    NEVER = "never"
    UNCAUGHT = "uncaught"
    ALL = "all"


class ExceptionBreakpointController:
    """Manages exception breakpoint filters for debug sessions."""

    def __init__(self, break_on_uncaught: bool = True, break_on_all: bool = False):
        self.break_on_uncaught = break_on_uncaught
        self.break_on_all = break_on_all

    def set_break_on_uncaught(self, enabled: bool) -> None:
        self.break_on_uncaught = enabled

    def set_break_on_all(self, enabled: bool) -> None:
        self.break_on_all = enabled

    def should_break_on_exception(self, is_uncaught: bool) -> bool:
        if self.break_on_all:
            return True
        if self.break_on_uncaught and is_uncaught:
            return True
        return False

    def get_dap_filters(self) -> List[str]:
        filters = []
        if self.break_on_uncaught:
            filters.append("uncaught")
        if self.break_on_all:
            filters.append("userUnhandled")
            filters.append("all")
        return filters
