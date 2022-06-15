import tkinter as tk

from .menuitem import MenuItem
from .separator import Separator


class MenuContainer(tk.Frame):
    def __init__(self, master, name, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master

        self.name = name
        
        self.configure(bg='#ffffff')
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)

        self.menu_items = []
        self.row = 0

    def add_first_item(self, text, command):
        new_item = MenuItem(self, text, command)
        new_item.grid(row=self.row, sticky=tk.EW, padx=1, pady=(10, 0))
        self.menu_items.append(new_item)

        self.row += 1
    
    def add_item(self, text, command):
        new_item = MenuItem(self, text, command)
        new_item.grid(row=self.row, sticky=tk.EW, padx=1, pady=(0, 0))
        self.menu_items.append(new_item)

        self.row += 1

    def add_last_item(self, text, command):
        new_item = MenuItem(self, text, command)
        new_item.grid(row=self.row, sticky=tk.EW, padx=1, pady=(0, 10))
        self.menu_items.append(new_item)

        self.row += 1

    def add_separator(self):
        new_sep = Separator(self)
        new_sep.grid(row=self.row, sticky=tk.EW, pady=(0, 0))
        self.menu_items.append(new_sep)

        self.row += 1
