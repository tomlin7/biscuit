import tkinter as tk

from .editors import EditorsPane
from .panel import Panel


class ContentPane(tk.PanedWindow):
    """
    Main frame holds ContentPane and Panel
    .
    App
    └── Root
        ├── Menubar
        ├── BaseFrame
        │    ├── ActionBar
        │    └── ContentPane 
        │        ├── EditorsPane
        │        └── Panel
        └── StatusBar
    """
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base
        
        self.configure(
            orient=tk.VERTICAL, bd=0, 
            relief=tk.FLAT, opaqueresize=False)

        self.editorspane = EditorsPane(self)
        self.panel = Panel(self)

        self.add(self.editorspane)
        self.add(self.panel)
