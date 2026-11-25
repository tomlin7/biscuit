from __future__ import annotations

import tkinter as tk
from typing import Any, Dict, List, Optional

from biscuit.common.ui import Tree
from ..sidebar_item import SideBarViewItem


class WatchManager:
    """Manages and evaluates watch expressions across debugger frames."""

    def __init__(self):
        self.expressions: List[str] = []

    def add_expression(self, expr: str) -> None:
        expr = expr.strip()
        if expr and expr not in self.expressions:
            self.expressions.append(expr)

    def remove_expression(self, expr: str) -> bool:
        if expr in self.expressions:
            self.expressions.remove(expr)
            return True
        return False

    def clear(self) -> None:
        self.expressions.clear()

    def evaluate_all(self, scope: Optional[Dict[str, Any]] = None) -> Dict[str, str]:
        results = {}
        eval_scope = scope if scope is not None else {}
        for expr in self.expressions:
            try:
                val = eval(expr, {"__builtins__": {}}, eval_scope)
                results[expr] = repr(val)
            except Exception as e:
                results[expr] = f"<error: {e}>"
        return results


class Watch(SideBarViewItem):
    """Debug sidebar pane for watch expressions."""

    def __init__(self, master, *args, **kwargs) -> None:
        self.title = "Watch"
        self.__actions__ = ()
        super().__init__(master, itembar=True, *args, **kwargs)

        self.manager = WatchManager()
        self.tree = Tree(
            self.content,
            style="mono.Treeview",
            columns=("expression", "value"),
            *args,
            **kwargs,
        )
        self.tree.grid(row=0, column=0, sticky=tk.NSEW)

    def update_watches(self, scope: Optional[Dict[str, Any]] = None) -> None:
        results = self.manager.evaluate_all(scope)
        self.tree.clear()
        for expr, val in results.items():
            self.tree.insert("", "end", text=expr, values=(val,))
