import tkinter as tk

from .tab import Tab
from core.components.utils import Frame


class Tabs(Frame):
    def __init__(self, master, width=200, *args, **kwargs):
        super().__init__(master, width=width, *args, **kwargs)
        self.pack_propagate(False)
        self.config(**self.base.theme.views.panel.terminal)

        self.tabs = []
        self.active_tab = None

    def add_tab(self, view):
        tab = Tab(self, view)
        tab.pack(fill=tk.X)
        self.tabs.append(tab)

        tab.select()

    def set_active_tab(self, selected_tab):
        self.active_tab = selected_tab
        for tab in self.tabs:
            if tab != selected_tab:
                tab.deselect()
