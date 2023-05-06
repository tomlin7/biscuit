import tkinter as tk

from .tab import Tab


class Tabs(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base
        
        self.config(bg='#f8f8f8')

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
