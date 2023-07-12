import tkinter as tk


class Separator(tk.Label):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master

        self.config(
            text="—"*round((18*self.base.scale)), pady=0,
            height=1, **self.base.theme.menu, fg=self.base.theme.border
        )
