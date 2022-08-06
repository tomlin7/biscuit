import tkinter as tk
from tkinter.constants import *

from .base import BaseFrame

from .menubar import Menubar
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

        self.menubar = Menubar(self)
        self.baseframe = BaseFrame(self)
        self.statusbar = Statusbar(self)

        self.menubar.pack(fill=X, expand=1)
        self.baseframe.pack(fill=BOTH)
        self.statusbar.pack(fill=X)
