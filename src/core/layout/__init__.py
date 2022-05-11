import tkinter as tk
from tkinter.constants import *

from .mainframe import MainFrame

from ..components import MenuBar
from ..components import StatusBar


class Root(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.menubar = MenuBar(self)
        self.primary = MainFrame(self)
        self.statusbar = StatusBar(self)

        self.menubar.pack(fill=X)
        self.primary.pack(fill=BOTH, expand=1)
        self.statusbar.pack(side=BOTTOM, fill=X)
