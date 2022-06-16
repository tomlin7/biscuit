import tkinter as tk

from .menu import MenuContainer


class Menu(tk.Toplevel):
    def __init__(self, master, name, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master

        self.configure(bg='#e8e8e8')
        self.withdraw()
        self.overrideredirect(True)
        # self.wm_attributes("-topmost", 1)

        self.menu = MenuContainer(self, name)
        self.menu.pack(fill=tk.BOTH, expand=True, padx=1, pady=1)

        self.configure_bindings()

    def configure_bindings(self):
        self.bind("<FocusOut>" , self.hide)
        self.bind("<Escape>", self.hide)

    def show(self, *args):
        self.update_idletasks()

        x = self.master.winfo_rootx()
        y = self.master.winfo_rooty() + self.master.winfo_height()
        self.wm_geometry(f"+{x}+{y}")
        
        self.deiconify()
        self.focus_set()

    def hide(self, *args):
        self.withdraw()

    def add_first_item(self, text, command):
        self.menu.add_first_item(text, command)
    
    def add_item(self, text, command=None):
        self.menu.add_item(text, command)

    def add_last_item(self, text, command):
        self.menu.add_last_item(text, command)
    
    def add_separator(self):
        self.menu.add_separator()
