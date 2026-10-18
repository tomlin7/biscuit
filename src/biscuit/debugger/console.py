from __future__ import annotations

import io
import sys
import traceback
from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass
class ConsoleEvaluationResult:
    expression: str
    output: str
    is_error: bool = False


class DebugConsoleSession:
    """Manages REPL evaluation and output history for active debug sessions."""

    def __init__(self):
        self.history: List[str] = []
        self.results: List[ConsoleEvaluationResult] = []

    def evaluate(self, expr: str, scope: Optional[Dict[str, Any]] = None) -> ConsoleEvaluationResult:
        expr = expr.strip()
        if not expr:
            return ConsoleEvaluationResult("", "", False)

        self.history.append(expr)
        eval_scope = scope if scope is not None else {}

        stdout_buf = io.StringIO()
        old_stdout = sys.stdout
        try:
            sys.stdout = stdout_buf
            try:
                # Try eval first for expression results
                val = eval(expr, eval_scope)
                printed = stdout_buf.getvalue()
                res_str = (printed + ("\n" if printed and not printed.endswith("\n") else "") + repr(val)).strip()
                result = ConsoleEvaluationResult(expr, res_str, is_error=False)
            except SyntaxError:
                # Fallback to exec for statements
                exec(expr, eval_scope)
                res_str = stdout_buf.getvalue().strip()
                result = ConsoleEvaluationResult(expr, res_str, is_error=False)
        except Exception as e:
            err_msg = traceback.format_exc().strip()
            result = ConsoleEvaluationResult(expr, err_msg, is_error=True)
        finally:
            sys.stdout = old_stdout

        self.results.append(result)
        return result

    def clear(self) -> None:
        self.results.clear()
