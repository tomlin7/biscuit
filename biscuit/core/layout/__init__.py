"""Layout
Defines the layout of app.

    .
    App
    └── Root
        ├── Menubar
        ├── BaseFrame
        └── StatusBar
"""
from __future__ import annotations

import tkinter as tk
import typing

from biscuit.core.utils import Frame

from .base import BaseFrame
from .menubar import Menubar
from .statusbar import Statusbar

if typing.TYPE_CHECKING:
    from ... import App
    from .base import *


class Root(Frame):
    """Root frame holds Menubar, BaseFrame, and Statusbar"""
    
    def __init__(self, base: App, *args, **kwargs) -> None:
        super().__init__(base, *args, **kwargs)
        self.config(bg=self.base.theme.border)

        grip_w = tk.Frame(self, bg=self.base.theme.primary_background, cursor='left_side')
        grip_w.bind("<B1-Motion>", lambda _: self.base.resize('w'))
        grip_w.pack(fill=tk.Y, side=tk.LEFT)

        container = Frame(self, bg=self.base.theme.border)
        container.pack(fill=tk.BOTH, expand=True, side=tk.LEFT)

        grip_e = tk.Frame(self, bg=self.base.theme.primary_background, cursor='right_side')
        grip_e.bind("<B1-Motion>", lambda _: self.base.resize('e'))
        grip_e.pack(fill=tk.Y, side=tk.LEFT)

        grip_n = tk.Frame(self, bg=self.base.theme.primary_background, cursor='top_side')
        grip_n.bind("<B1-Motion>", lambda _: self.base.resize('n'))
        grip_n.pack(fill=tk.X, in_=container)

        self.menubar = Menubar(self)
        self.menubar.pack(fill=tk.BOTH, in_=container)

        self.baseframe = BaseFrame(self)
        self.baseframe.pack(fill=tk.BOTH, expand=True, pady=(1,0), in_=container)

        self.statusbar = Statusbar(self)
        self.statusbar.pack(fill=tk.X, pady=(1,0), in_=container)

        grip_s = tk.Frame(self, bg=self.base.theme.primary_background, cursor='bottom_side')
        grip_s.bind("<B1-Motion>", lambda _: self.base.resize('s'))
        grip_s.pack(fill=tk.X, in_=container)
