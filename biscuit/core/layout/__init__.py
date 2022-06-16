import tkinter as tk
from tkinter.constants import *

from .mainframe import MainFrame

from .menubar import Menubar
from .statusbar import Statusbar


class Root(tk.Frame):
    """
    Root frame holds Menubar, MainFrame, and Statusbar
    .
    App
    └── Root
        ├── Menubar
        ├── MainFrame
        └── StatusBar
    """
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.menubar = Menubar(self)
        self.primary = MainFrame(self)
        self.statusbar = Statusbar(self)

        self.menubar.pack(fill=X)
        self.primary.pack(fill=BOTH, expand=1)
        self.statusbar.pack(side=BOTTOM, fill=X)
