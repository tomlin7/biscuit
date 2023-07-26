import tkinter as tk
from tkinter.constants import *

from .editors import EditorsPane
from .panel import Panel

from biscuit.core.components.utils import Frame


class ContentPane(Frame):
    """
    Main frame holds ContentPane and Panel
    .
    App
    └── Root
        ├── Menubar
        ├── BaseFrame
        │    ├── SideBar
        │    └── ContentPane 
        │        ├── EditorsPane
        │        └── Panel
        └── StatusBar
    """
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.border)
        
        self.editorspane = EditorsPane(self)
        self.panel = Panel(self)
        self._panel_enabled = False
        self._panel_maxed = False

        self.editorspane.pack(fill=BOTH, expand=True)
    
    def toggle_panel(self, *_):
        if self._panel_enabled:
            self.panel.pack_forget()
            self.editorspane.pack(fill=BOTH, expand=True)
        else:
            if self._panel_maxed:
                self.panel.pack(fill=BOTH, pady=(1, 0), expand=True)
                self.editorspane.pack_forget()
            else:
                self.panel.pack(fill=BOTH, pady=(1, 0))

        self._panel_enabled = not self._panel_enabled
    
    def toggle_max_panel(self, *_):
        if self._panel_maxed:
            self.panel.pack_forget()
            self.editorspane.pack(fill=BOTH, expand=True)
            self.panel.pack(fill=BOTH, pady=(1, 0))
        else:
            self.editorspane.pack_forget()
            self.panel.pack(fill=BOTH, pady=(1, 0), expand=True)
        
        self._panel_maxed = not self._panel_maxed
