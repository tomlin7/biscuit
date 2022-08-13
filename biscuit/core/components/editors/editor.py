import os
import tkinter as tk


class BaseEditor(tk.Frame):
    """
    Base class for editors.
    """
    def __init__(self, master, path, exists, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.path = path
        self.exists = exists
        self.editable = True
