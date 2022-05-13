import tkinter as tk
from tkinter.constants import *


class Tabsbar(tk.Frame):
    """
    Tabsbar holds all tabs.
    """
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs):
        self.master = master
        self.base = master.base
