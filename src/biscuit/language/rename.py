from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Any

@dataclass
class RenameEdit:
    uri: str
    new_text: str
    line: int
    character: int

class WorkspaceRenameManager:
    def __init__(self):
        self.pending_edits: Dict[str, List[RenameEdit]] = {}

    def parse_workspace_edit(self, workspace_edit: Dict[str, Any]) -> int:
        self.pending_edits.clear()
        changes = workspace_edit.get("changes", {})
        total_edits = 0
        for uri, edits in changes.items():
            self.pending_edits[uri] = []
            for edit in edits:
                start = edit.get("range", {}).get("start", {})
                self.pending_edits[uri].append(RenameEdit(
                    uri=uri,
                    new_text=edit.get("newText", ""),
                    line=start.get("line", 0),
                    character=start.get("character", 0),
                ))
                total_edits += 1
        return total_edits
