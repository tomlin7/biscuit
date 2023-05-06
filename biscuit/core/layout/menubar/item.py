import tkinter as tk

from ...components import Menu


class MenubarItem(tk.Menubutton):
    def __init__(self, master, text, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master

        self.name = text

        self.config(text=text, padx=10, pady=5,
                    bg='#f8f8f8', fg='black', activebackground='#e4e4e4', activeforeground='black')

        self.add_menu()

    def add_menu(self):
        self.menu = Menu(self, self.name)
        self.bind("<Button-1>", self.menu.show)
