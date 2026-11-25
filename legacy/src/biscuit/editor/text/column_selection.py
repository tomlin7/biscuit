from __future__ import annotations
from dataclasses import dataclass
from typing import List, Tuple

@dataclass
class ColumnSelection:
    start_row: int
    start_col: int
    end_row: int
    end_col: int

    def get_line_ranges(self) -> List[Tuple[str, str]]:
        min_row, max_row = sorted([self.start_row, self.end_row])
        min_col, max_col = sorted([self.start_col, self.end_col])
        return [
            (f"{r}.{min_col}", f"{r}.{max_col}")
            for r in range(min_row, max_row + 1)
        ]
