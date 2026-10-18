from __future__ import annotations
from typing import List, Dict, Any

class DocumentFormatter:
    def __init__(self, format_on_save: bool = False):
        self.format_on_save = format_on_save

    def apply_edits(self, original_text: str, edits: List[Dict[str, Any]]) -> str:
        # edits are sorted reverse by start line/character to prevent offset shifts
        lines = original_text.splitlines(keepends=True)
        # Apply whole document replacement if present
        for edit in edits:
            if edit.get("newText") is not None and not edit.get("range"):
                return edit["newText"]
        return original_text
