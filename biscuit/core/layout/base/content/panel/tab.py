import tkinter as tk
from tkinter.constants import *


class Tab(tk.Menubutton):
    def __init__(self, master, view, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.view = view
        self.selected = False
        
        self.config(text=view.__class__.__name__, padx=5, pady=5,
            font=("Segoe UI", 10), fg='#424242', bg='#f8f8f8')

        self.bind('<Button-1>', self.select)

    def deselect(self, *_):
        if self.selected:
            self.view.grid_remove()
            self.config(fg="#424242")
            self.selected = False
        
    def select(self, *_):
        if not self.selected:
            self.master.set_active_tab(self)
            self.view.grid(column=0, row=1, sticky=NSEW)
            self.config(fg="black")
            self.selected = True
