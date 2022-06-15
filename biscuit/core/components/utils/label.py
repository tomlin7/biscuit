import tkinter as tk


class WrappingLabel(tk.Label):
    """
    a type of Label that automatically adjusts the wrap to the size
    """
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.bind('<Configure>', lambda e: self.config(wraplength=self.winfo_width()))
