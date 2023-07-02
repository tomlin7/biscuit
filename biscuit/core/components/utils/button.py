import tkinter as tk

from .menubutton import Menubutton


class Button(Menubutton):
    """
    A Flat style button 
    """
    def __init__(self, master, text, command=lambda _: None, *args, **kwargs):
        super().__init__(master, text=text, *args, **kwargs)
        self.config(pady=5, **self.base.theme.utils.button)
        self.bind('<Button-1>', command)
