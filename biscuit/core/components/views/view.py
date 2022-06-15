import tkinter as tk
from tkinter.constants import *


class View(tk.Frame):
    """
    View is a container of content that can appear in the sidebar or panel
    """
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base
