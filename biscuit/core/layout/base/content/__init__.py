# TODO Use grid manager
#   As editorspane have an emptytab to be replaced
#   and panel can be made hidden, using grid manager
#   is the way to go here, to keep it less glitchy.

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
        self._panel_enabled = False
        self._panel_maxed = False

        self.editorspane.pack(fill=BOTH, expand=True)
    
    def toggle_panel(self, *_):
        if self._panel_enabled:
            self.panel.pack_forget()
            if self._panel_maxed:
                self.editorspane.pack(fill=BOTH, expand=True)
        else:
            self.panel.pack(fill=BOTH, pady=(1, 0))
            if self._panel_maxed:
                self.editorspane.pack_forget()
        
        self._panel_enabled = not self._panel_enabled
    
    def toggle_max_panel(self, *_):
        if self._panel_maxed:
            self.panel.pack_forget()
            self.editorspane.pack(fill=BOTH, expand=True)
            self.panel.pack(fill=BOTH, pady=(1, 0))
        else:
            self.editorspane.pack_forget()
            if not self._panel_enabled:
                self.toggle_panel()
        
        self._panel_maxed = not self._panel_maxed
