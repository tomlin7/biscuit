import tkinter as tk

from .tab import Tab


class Tabs(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.config(bg='white')

        self.tabs = []

    def add_tab(self, view):
        tab = Tab(self, view)
        tab.pack(fill=tk.Y, side=tk.LEFT)
        self.tabs.append(tab)
    
    def set_active_tab(self, view):
        for tab in self.tabs:
            if tab.view != view:
                tab.deselect()
        self.master.set_active_view(view)
