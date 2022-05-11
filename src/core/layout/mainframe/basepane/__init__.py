import tkinter as tk

from .contentpane import ContentPane
from ....components import Terminal

class BasePane(tk.PanedWindow):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        
        self.configure(
            orient=tk.VERTICAL, bd=0, 
            relief=tk.FLAT, opaqueresize=False)

        self.mainpane = ContentPane(self)
        self.terminal = Terminal(self)

        self.add(self.mainpane)
        self.add(self.terminal)
