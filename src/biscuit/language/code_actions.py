from __future__ import annotations
from dataclasses import dataclass
from typing import List, Dict, Any, Optional

@dataclass
class CodeAction:
    title: str
    kind: str # 'quickfix', 'refactor', 'source.organizeImports'
    edit: Optional[Dict[str, Any]] = None
    command: Optional[str] = None

class CodeActionManager:
    def __init__(self):
        self.actions: List[CodeAction] = []

    def set_actions(self, actions: List[CodeAction]):
        self.actions = actions

    def get_quick_fixes(self) -> List[CodeAction]:
        return [a for a in self.actions if a.kind.startswith("quickfix")]

    def get_refactorings(self) -> List[CodeAction]:
        return [a for a in self.actions if a.kind.startswith("refactor")]
