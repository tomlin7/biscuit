import tkinter as tk

from .terminal import Terminal


class TerminalPane(tk.Frame):
    def __init__(self, master, active=False, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.active = active

        self.terminal = Terminal(self)
        self.terminal.config(
            font=("Consolas", 15), bg="#FFFFFF", bd=0, 
            padx=0, pady=0, wrap=tk.WORD, relief=tk.FLAT)
        self.terminal.pack(fill=tk.BOTH, expand=True)
    
    def toggle(self):
        self.active = not self.active
        
        if self.active:
            self.master.add(self)
        else:
        	self.master.forget(self)