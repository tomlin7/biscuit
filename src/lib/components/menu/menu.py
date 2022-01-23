import tkinter as tk

from .menuitem import MenuItem
from .separator import Separator


class Menu(tk.Toplevel):
    def __init__(self, master, name, *args, **kwargs):
        super().__init__(master, *args, **kwargs)

        self.base = master.base
        self.master = master
        
        self.configure(bg='#ffffff')
        self.withdraw()
        self.overrideredirect(True)
        # self.wm_attributes("-topmost", 1)

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)

        self.menu_items = []

        self.row = 0

        self.configure_bindings()

    def configure_bindings(self):
        self.bind("<FocusOut>" , self.hide)
        self.bind("<Escape>", self.hide)

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
        new_sep.grid(row=self.row, sticky=tk.EW, padx=2, pady=(0, 0))
        self.menu_items.append(new_sep)

        self.row += 1

    def show(self, *args):
        self.update_idletasks()
        x, y, cx, cy = self.base.root.bbox(tk.INSERT)
        x = x + self.base.root.winfo_rootx()
        y = y + cy + self.base.root.winfo_rooty() + 35
        
        # self.update_idletasks()
        # x = self.base.root.get_popup_x(self.winfo_width())
        # y = self.base.root.get_popup_y()
        
        self.wm_geometry(f"+{x}+{y}")
        
        self.deiconify()
        self.focus_set()

    def hide(self, *args):
        self.withdraw()
