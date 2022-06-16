import tkinter as tk
from tkinter.constants import *

from .sidebar import Sidebar
from .editorsframe import EditorsFrame


class ContentPane(tk.PanedWindow):
    """
    Main frame holds ContentPane and Terminal
    .
    App
    └── Root
        ├── Menubar
        ├── MainFrame
        │    ├── ActionBar
        │    └── BasePane 
        │        ├── ContentPane
        │        │    ├── Sidebar
        │        │    └── EditorsFrame
        │        └── Terminal
        └── StatusBar
    """
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.config(
            orient=HORIZONTAL, bd=0,
            relief=FLAT, opaqueresize=False)

        self.sidebar = Sidebar(self)
        self.mainpane = EditorsFrame(self)
        
        self.add(self.sidebar)
        self.add(self.mainpane)
