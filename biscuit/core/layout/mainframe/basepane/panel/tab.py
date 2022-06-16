import tkinter as tk
from tkinter import font


class Tab(tk.Menubutton):
    def __init__(self, master, view, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.view = view
        self.selected = True
        
        self.config(
            text=view.__class__.__name__, 
            font=("Segoe UI", 10),
            bg='white')

        self.bind('<Button-1>', self.select)

    def deselect(self, *_):
        if self.selected:
            self.selected = False
        
    def select(self, *_):
        if not self.selected:
            self.selected = True
        self.master.set_active_tab(self.view)
