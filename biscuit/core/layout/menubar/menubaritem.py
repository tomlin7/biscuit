import tkinter as tk

from ...components import Menu


class MenuBarItem(tk.Menubutton):
    def __init__(self, master, text, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master

        self.name = text

        self.config(text=text, font=("Segoe UI", 10),
            padx=9, bg="#dddddd", fg="#575757", pady=5,
            activebackground="#c6c6c6", activeforeground="#575757"
        )

        self.add_menu()

    def add_menu(self):
        self.menu = Menu(self, self.name)
        self.bind("<Button-1>", self.menu.show)
