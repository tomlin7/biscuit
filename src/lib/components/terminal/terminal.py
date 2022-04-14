import tkinter as tk
from .base import TerminalBase


class Terminal(TerminalBase):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        
        self.config(
            font=("Consolas", 15), bg="#FFFFFF", bd=0, fg="#333333", 
            padx=10, pady=10, wrap=tk.WORD, relief=tk.FLAT)
        self.shell = True