import tkinter as tk


class Separator(tk.Label):
    def __init__(self, master, length=18, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master

        self.config(
            text="—"*round((length*self.base.scale)), pady=0,
            height=1, **self.base.theme.menu, fg=self.base.theme.border
        )
