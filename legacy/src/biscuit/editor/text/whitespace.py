from __future__ import annotations
from typing import List, Tuple

class WhitespaceRenderer:
    def __init__(self, mode: str = "none"):
        self.mode = mode # 'none', 'selection', 'all'

    def get_whitespace_decorations(self, text: str) -> List[Tuple[int, str]]:
        decorations = []
        if self.mode == "none":
            return decorations
        for i, ch in enumerate(text):
            if ch == " ":
                decorations.append((i, "·"))
            elif ch == "\t":
                decorations.append((i, "→"))
            elif ch == "\n":
                decorations.append((i, "↵"))
        return decorations
