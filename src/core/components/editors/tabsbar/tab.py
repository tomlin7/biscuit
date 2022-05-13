import tkinter as tk
from tkinter.constants import *


class Tab(tk.Frame):
    """
    Tab is a single tab contained in the tabsbar.
    """
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base
