import tkinter as tk
import typing

if typing.TYPE_CHECKING:
    from biscuit.core import App


class Text(tk.Text):
    """Text widget with reference to base"""
    
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base: App = master.base
