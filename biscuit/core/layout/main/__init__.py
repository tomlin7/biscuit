import tkinter as tk
from tkinter.constants import *

from .base import BasePane
from .sidebar import Sidebar


class MainFrame(tk.Frame):
    """
    Main frame holds Sidebar and BasePane
    .
    App
    └── Root
        ├── Menubar
        ├── MainFrame
        │    ├── Sidebar
        │    └── BasePane 
        └── StatusBar
    """
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.sidebar = Sidebar(self)
        self.basepane = BasePane(master=self)

        self.sidebar.pack(side=LEFT, fill=Y)
        self.basepane.pack(fill=BOTH, expand=1, side=LEFT)
