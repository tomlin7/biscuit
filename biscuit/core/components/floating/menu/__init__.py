# TODO Menus
# - Have various types of menus
# - Context menus for various buttons across the editor
# - Make the api more clean and easy to use like palette
#   - isolate tkinter_menus library

import tkinter as tk

from biscuit.core.utils import Frame, Toplevel

from .checkable import CheckableMenuItem
from .menuitem import MenuItem
from .separator import Separator


class Menu(Toplevel):
    def __init__(self, master, name, *args, **kwargs) -> None:
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

    def get_coords(self, *e):
        return self.master.winfo_rootx(), self.master.winfo_rooty() + self.master.winfo_height()

    def show(self, *e):
        self.active = True
        self.update_idletasks()

        x, y = self.get_coords(*e)
        self.wm_geometry(f"+{x}+{y}")

        self.deiconify()
        self.focus_set()

    def hide(self, *args):
        self.active = False
        self.withdraw()
        self.master.event_generate("<<Hide>>")

    def add_item(self, text, command=lambda *_:...):
        new_item = MenuItem(self.container, text, command)
        new_item.grid(row=self.row, sticky=tk.EW, pady=0)
        self.menu_items.append(new_item)

        self.row += 1
        return new_item
    
    def add_checkable(self, text, command=lambda *_:..., checked=False):
        new_item = CheckableMenuItem(self.container, text, command, checked=checked)
        new_item.grid(row=self.row, sticky=tk.EW, pady=0)
        self.menu_items.append(new_item)

        self.row += 1
        return new_item
    
    def add_command(self, *args, **kwargs):
        self.add_item(*args, **kwargs)

    def add_separator(self, length=18):
        new_sep = Separator(self.container, length)
        new_sep.grid(row=self.row, sticky=tk.EW, pady=0)
        self.menu_items.append(new_sep)

        self.row += 1
