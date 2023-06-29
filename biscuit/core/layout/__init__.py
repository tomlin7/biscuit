import tkinter as tk
from tkinter.constants import *

from .menubar import Menubar
from .base import BaseFrame
from .statusbar import Statusbar


class Root(tk.Frame):
    """
    Root frame holds Menubar, BaseFrame, and Statusbar
    .
    App
    └── Root
        ├── Menubar
        ├── BaseFrame
        └── StatusBar
    """
    def __init__(self, base, *args, **kwargs):
        super().__init__(base, *args, **kwargs)
        self.base = base
        self.config(bg="#dfdfdf")

        self.menubar = Menubar(self)
        self.baseframe = BaseFrame(self)
        self.statusbar = Statusbar(self)

        self.menubar.pack(fill=X)
        self.baseframe.pack(fill=BOTH, expand=1, pady=(1,0))
        self.statusbar.pack(fill=X, pady=(1,0))
