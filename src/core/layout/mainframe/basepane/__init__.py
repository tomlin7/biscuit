import tkinter as tk

from .contentpane import ContentPane
from .panel import Panel

class BasePane(tk.PanedWindow):
    """
    Main frame holds ContentPane and Panel
    .
    App
    └── Root
        ├── Menubar
        ├── MainFrame
        │    ├── ActionBar
        │    └── BasePane 
        │        ├── ContentPane
        │        └── Panel
        └── StatusBar
    """
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        
        self.configure(
            orient=tk.VERTICAL, bd=0, 
            relief=tk.FLAT, opaqueresize=False)

        self.mainpane = ContentPane(self)
        self.panel = Panel(self)

        self.add(self.mainpane)
        self.add(self.panel)
