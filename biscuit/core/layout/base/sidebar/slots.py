import tkinter as tk

from .slot import Slot


class Slots(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base 

        self.config(width=100, bg='white')

        self.tabs = []

    def add_slot(self, view):
        tab = Slot(self, "\ueaf0", view)
        tab.pack(fill=tk.Y)
        self.tabs.append(tab)
    
    def set_active_slot(self, view):
        for tab in self.tabs:
            if tab.view != view:
                tab.deselect()
        self.master.set_active_view(view)
