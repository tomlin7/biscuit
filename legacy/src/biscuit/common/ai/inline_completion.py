from __future__ import annotations
from dataclasses import dataclass
from typing import Optional

@dataclass
class InlineCompletionState:
    prefix: str
    suffix: str
    suggestion: Optional[str] = None
    is_active: bool = False

    def trigger(self, prefix: str, suffix: str, suggestion: str):
        self.prefix = prefix
        self.suffix = suffix
        self.suggestion = suggestion
        self.is_active = True

    def accept(self) -> Optional[str]:
        if not self.is_active:
            return None
        res = self.suggestion
        self.dismiss()
        return res

    def dismiss(self):
        self.suggestion = None
        self.is_active = False
