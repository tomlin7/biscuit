from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class ParameterInfo:
    label: str
    documentation: Optional[str] = None

@dataclass
class SignatureInfo:
    label: str
    parameters: List[ParameterInfo] = field(default_factory=list)
    active_parameter: int = 0
    documentation: Optional[str] = None

class SignatureHelpController:
    def __init__(self):
        self.active_signature: Optional[SignatureInfo] = None
        self.is_visible: bool = False

    def update_signature(self, signature: SignatureInfo):
        self.active_signature = signature
        self.is_visible = True

    def dismiss(self):
        self.active_signature = None
        self.is_visible = False

    def compute_active_parameter(self, text_before_cursor: str) -> int:
        if "(" not in text_before_cursor:
            return 0
        args_text = text_before_cursor[text_before_cursor.rfind("(") + 1:]
        return args_text.count(",")
