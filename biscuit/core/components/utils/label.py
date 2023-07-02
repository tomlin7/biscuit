import tkinter as tk

class Label(tk.Label):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base


class WrappingLabel(Label):
    """
    a type of Label that automatically adjusts the wrap to the size
    """
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.bind('<Configure>', lambda e: self.config(wraplength=self.winfo_width()))
