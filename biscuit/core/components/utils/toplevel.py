import tkinter as tk
import typing

if typing.TYPE_CHECKING:
    from biscuit.core import App

class Toplevel(tk.Toplevel):
    """Custom Toplevel widget for the app."""

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base: App = master.base

    def geometry_size(self, width=None, height=None) -> None:
        """Set the size of the toplevel window."""
        
        app_width = round(width * self.base.scale)
        app_height = round(height * self.base.scale)
        self.geometry(f"{app_width}x{app_height}")
