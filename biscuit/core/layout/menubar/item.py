import tkinter as tk

from core import Menu


class MenubarItem(tk.Menubutton):
    def __init__(self, menubar, text, *args, **kwargs):
        super().__init__(menubar, *args, **kwargs)
        self.base = menubar.base
        self.menubar = menubar

        self.name = text
        self.config(text=text, padx=10, pady=5,
                    bg='#f8f8f8', fg='black', activebackground='#e4e4e4', activeforeground='black')

        self.menu = Menu(self, self.name)
        self.bind("<Button-1>", self.menu.show)
        self.bind("<Enter>", self.hover)
    
    def hover(self, *_):
        self.menubar.switch_menu(self.menu)
