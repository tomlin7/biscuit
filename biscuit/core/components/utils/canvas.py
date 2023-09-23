import tkinter as tk


class Canvas(tk.Canvas):
    """
    normal canvas with reference to base
    """
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base
