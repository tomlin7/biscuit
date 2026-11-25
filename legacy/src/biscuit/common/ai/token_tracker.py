from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, Optional

@dataclass
class TokenTracker:
    session_input_tokens: int = 0
    session_output_tokens: int = 0
    budget_tokens: int = 100000

    def record_usage(self, input_tokens: int, output_tokens: int):
        self.session_input_tokens += input_tokens
        self.session_output_tokens += output_tokens

    @property
    def total_tokens(self) -> int:
        return self.session_input_tokens + self.session_output_tokens

    @property
    def is_budget_exceeded(self) -> bool:
        return self.total_tokens >= self.budget_tokens

    def get_summary(self) -> str:
        return f"{self.total_tokens}/{self.budget_tokens} tokens"
