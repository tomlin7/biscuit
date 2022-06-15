import tkinter as tk
from tkinter.constants import *


class Panel(tk.Frame):
    """
    Panel is a tabbed container for views.
    """
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base
