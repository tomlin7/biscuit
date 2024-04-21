from __future__ import annotations

import tkinter as tk
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from biscuit.core import App

class Canvas(tk.Canvas):
    """normal canvas with reference to base"""
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base: App = master.base
