from __future__ import annotations
import difflib
from dataclasses import dataclass
from typing import Dict, Any, List

@dataclass
class TextEditChange:
    start_line: int
    start_col: int
    end_line: int
    end_col: int
    text: str

    def to_lsp_dict(self) -> Dict[str, Any]:
        return {
            "range": {
                "start": {"line": self.start_line, "character": self.start_col},
                "end": {"line": self.end_line, "character": self.end_col},
            },
            "text": self.text,
        }

def compute_incremental_changes(old_text: str, new_text: str) -> List[TextEditChange]:
    matcher = difflib.SequenceMatcher(None, old_text, new_text)
    changes = []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            continue
        # Convert character offset to line/col approx
        start_line = old_text[:i1].count("\n")
        start_col = i1 - (old_text[:i1].rfind("\n") + 1 if "\n" in old_text[:i1] else 0)
        end_line = old_text[:i2].count("\n")
        end_col = i2 - (old_text[:i2].rfind("\n") + 1 if "\n" in old_text[:i2] else 0)
        replacement = new_text[j1:j2]
        changes.append(TextEditChange(start_line, start_col, end_line, end_col, replacement))
    return changes
