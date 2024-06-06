import tkinter as tk
import typing

if typing.TYPE_CHECKING:
    from src.biscuit import App


class Text(tk.Text):
    """Text widget with reference to base"""
    
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base: App = master.base

class Toplevel(tk.Toplevel):
    """Custom Toplevel widget for the app."""

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base: App = master.base

class Canvas(tk.Canvas):
    """Canvas with reference to base"""
    
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base: App = master.base

class Menubutton(tk.Menubutton):
    """Menubutton with reference to base"""
    
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base: App = master.base

class Label(tk.Label):
    """Label with reference to base"""

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

    def set_text(self, text: str) -> None:
        self.config(text=text)

class Frame(tk.Frame):
    """Frame with reference to base"""
    
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base: App = master.base
