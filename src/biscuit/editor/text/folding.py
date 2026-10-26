from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Tuple

@dataclass
class FoldRange:
    start_line: int
    end_line: int
    is_folded: bool = False

class CodeFoldingManager:
    def __init__(self):
        self.folds: Dict[int, FoldRange] = {}

    def add_fold(self, start_line: int, end_line: int) -> FoldRange:
        fold = FoldRange(start_line, end_line)
        self.folds[start_line] = fold
        return fold

    def toggle_fold(self, start_line: int) -> bool:
        if start_line in self.folds:
            self.folds[start_line].is_folded = not self.folds[start_line].is_folded
            return self.folds[start_line].is_folded
        return False

    def is_line_folded(self, start_line: int) -> bool:
        return self.folds.get(start_line, FoldRange(0, 0)).is_folded

    def compute_indent_folds(self, lines: List[str]) -> List[Tuple[int, int]]:
        folds = []
        for i, line in enumerate(lines):
            stripped = line.rstrip()
            if not stripped:
                continue
            indent = len(line) - len(line.lstrip())
            is_header = stripped.endswith(":") or stripped.endswith("{")
            has_indented_child = (
                i + 1 < len(lines)
                and lines[i + 1].strip() != ""
                and (len(lines[i + 1]) - len(lines[i + 1].lstrip())) > indent
            )
            if is_header or has_indented_child:
                found = False
                for j in range(i + 1, len(lines)):
                    next_line = lines[j]
                    if next_line.strip() and (len(next_line) - len(next_line.lstrip())) <= indent:
                        folds.append((i + 1, j))
                        found = True
                        break
                if not found and len(lines) > i + 1:
                    folds.append((i + 1, len(lines)))
        return folds
