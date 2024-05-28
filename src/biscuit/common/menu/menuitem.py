import tkinter as tk

from src.biscuit.utils import Menubutton


class MenuItem(Menubutton):
    def __init__(self, master, text, command=lambda *_:..., *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.command = command

        self.config(text=text, anchor=tk.W, font=("Segoe UI", 10), cursor="hand2",
            padx=20, pady=2, **self.base.theme.menu.item
        )
        self.bind("<Button-1>", self.onclick)

    def onclick(self, *_) -> None:
        self.master.hide()
        self.command()
