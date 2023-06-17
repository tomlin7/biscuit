import os
import tkinter as tk


class BaseEditor(tk.Frame):
    """
    Base class for editors.
    """
    def __init__(self, master, path=None, exists=None, editable=True, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.path = path
        self.exists = exists
        self.editable = editable

        self.__buttons__ = ()

    def save(self, *_):
        ...
