from __future__ import annotations
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class StickyHeaderScope:
    line_number: int
    header_text: str

class StickyScrollController:
    def __init__(self):
        self.scopes: List[StickyHeaderScope] = []

    def set_scopes(self, scopes: List[StickyHeaderScope]):
        self.scopes = sorted(scopes, key=lambda s: s.line_number)

    def get_active_headers(self, current_top_line: int) -> List[str]:
        active = []
        for s in self.scopes:
            if s.line_number < current_top_line:
                active.append(s.header_text)
            else:
                break
        return active[-2:] # Show up to 2 enclosing scopes
