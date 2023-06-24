# TODO Menus
# - Have various types of menus
# - Context menus for various buttons across the editor
# - Make the api more clean and easy to use like palette
#   - isolate tkinter_menus library

import tkinter as tk

from .menu import MenuContainer


class Menu(tk.Toplevel):
    def __init__(self, master, name, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master

        self.active = False
        self.configure(bg='#d4d4d4')
        self.withdraw()
        self.overrideredirect(True)

        self._menu = MenuContainer(self, name)
        self._menu.pack(fill=tk.BOTH, expand=True, padx=1, pady=1)

        self.configure_bindings()

    def configure_bindings(self):
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
        self._menu.add_item(text, command)

    def add_separator(self):
        self._menu.add_separator()
