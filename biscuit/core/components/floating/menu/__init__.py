# TODO Menus
# - Have various types of menus
# - Context menus for various buttons across the editor
# - Make the api more clean and easy to use like palette
#   - isolate tkinter_menus library

import tkinter as tk

from core.components.utils import Frame, Toplevel

from .menuitem import MenuItem
from .separator import Separator


class Menu(Toplevel):
    def __init__(self, master, name, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.active = False
        self.name = name

        self.config(bg=self.base.theme.border)
        self.withdraw()
        self.overrideredirect(True)

        self.container = Frame(self, padx=5, pady=5, **self.base.theme.menu)
        self.container.pack(fill=tk.BOTH, expand=True, padx=1, pady=1)
        self.container.grid_columnconfigure(0, weight=1)
        self.container.grid_rowconfigure(0, weight=1)
        self.container.hide = self.hide

        self.menu_items = []
        self.row = 0

        self.config_bindings()

    def config_bindings(self):
        self.bind("<FocusOut>" , self.hide)
        self.bind("<Escape>", self.hide)
    
    def get_coords(self):
        return self.master.winfo_rootx(), self.master.winfo_rooty() + self.master.winfo_height()

    def show(self, *args):
        self.active = True
        self.update_idletasks()

        x, y = self.get_coords()
        self.wm_geometry(f"+{x}+{y}")
        
        self.deiconify()
        self.focus_set()
    
    def hide(self, *args):
        self.active = False
        self.withdraw()

    def add_item(self, text, command=lambda *_:...):
        new_item = MenuItem(self.container, text, command)
        new_item.grid(row=self.row, sticky=tk.EW, pady=0)
        self.menu_items.append(new_item)

        self.row += 1

    def add_separator(self):
        new_sep = Separator(self.container)
        new_sep.grid(row=self.row, sticky=tk.EW, pady=0)
        self.menu_items.append(new_sep)

        self.row += 1
