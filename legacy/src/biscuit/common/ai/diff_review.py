from __future__ import annotations
import difflib
from dataclasses import dataclass
from typing import Dict, List, Optional

@dataclass
class PendingEdit:
    path: str
    original_content: str
    proposed_content: str

    def diff(self) -> str:
        orig_lines = self.original_content.splitlines(keepends=True)
        prop_lines = self.proposed_content.splitlines(keepends=True)
        return "".join(difflib.unified_diff(
            orig_lines, prop_lines, fromfile=f"a/{self.path}", tofile=f"b/{self.path}"
        ))

class DiffReviewManager:
    def __init__(self):
        self.pending_edits: Dict[str, PendingEdit] = {}

    def stage_edit(self, path: str, original_content: str, proposed_content: str) -> PendingEdit:
        edit = PendingEdit(path, original_content, proposed_content)
        self.pending_edits[path] = edit
        return edit

    def accept_edit(self, path: str) -> Optional[PendingEdit]:
        return self.pending_edits.pop(path, None)

    def reject_edit(self, path: str) -> Optional[PendingEdit]:
        return self.pending_edits.pop(path, None)

    def list_pending(self) -> List[PendingEdit]:
        return list(self.pending_edits.values())
