import tkinter as tk


class Canvas(tk.Canvas):
    """
    normal frame with reference to base
    """
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base
