from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List

@dataclass
class DiffGutterMark:
    line_number: int
    change_type: str # 'added', 'modified', 'deleted'

class GitGutterController:
    def __init__(self):
        self.marks: Dict[int, DiffGutterMark] = {}

    def set_line_diffs(self, added: List[int], modified: List[int], deleted: List[int]):
        self.marks.clear()
        for l in added:
            self.marks[l] = DiffGutterMark(l, "added")
        for l in modified:
            self.marks[l] = DiffGutterMark(l, "modified")
        for l in deleted:
            self.marks[l] = DiffGutterMark(l, "deleted")

    def get_mark_color(self, line: int) -> str:
        mark = self.marks.get(line)
        if not mark:
            return ""
        if mark.change_type == "added":
            return "#28a745"
        elif mark.change_type == "modified":
            return "#007acc"
        elif mark.change_type == "deleted":
            return "#d73a49"
        return ""
