import tkinter as tk


class Menubutton(tk.Menubutton):
    """
    normal menubutton with reference to base
    """
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base
