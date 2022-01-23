import tkinter as tk


class Separator(tk.Label):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master

        self.config(
            text="—————————————————————————",
            padx=10, bg="#ffffff", fg="#d4d4d4", height=1
        )
