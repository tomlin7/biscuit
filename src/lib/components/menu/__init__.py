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

    def show(self, *args):
        self.menu.show()

    def hide(self, *args):
        self.menu.hide()

    def add_first_item(self, text, command):
        self.menu.add_first_item(text, command)
    
    def add_item(self, text, command):
        self.menu.add_item(text, command)

    def add_last_item(self, text, command):
        self.menu.add_last_item(text, command)
    
    def add_separator(self):
        self.menu.add_separator()
