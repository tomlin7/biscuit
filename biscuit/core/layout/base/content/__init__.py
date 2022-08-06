import tkinter as tk
from tkinter.constants import *

from .editors import EditorsPane
from .panel import Panel


class ContentPane(tk.Frame):
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
        
        self.editorspane = EditorsPane(self)
        self.panel = Panel(self)

        self.editorspane.pack(fill=BOTH, expand=True)
        self.panel.pack(fill=BOTH, pady=(1, 0))
