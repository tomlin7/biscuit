import tkinter as tk


class Text(tk.Text):
    """
    Text widget with reference to base
    """
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base
