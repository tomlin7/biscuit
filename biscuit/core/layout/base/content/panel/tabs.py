import tkinter as tk

from .tab import Tab
from biscuit.core.components.utils import Frame


class Tabs(Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.layout.base.content.panel.bar)

        self.tabs = []
        self.active_tab = None

    def add_tab(self, view):
        tab = Tab(self, view)
        tab.pack(fill=tk.Y, side=tk.LEFT)
        self.tabs.append(tab)

        tab.select()

    def set_active_tab(self, selected_tab):
        self.active_tab = selected_tab
        self.master.replace_buttons(selected_tab.view.__buttons__)
        for tab in self.tabs:
            if tab != selected_tab:
                tab.deselect()
