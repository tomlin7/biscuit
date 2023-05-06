import tkinter as tk
from tkinter.constants import *

from ....components.utils import get_codicon


class Slot(tk.Menubutton):
    def __init__(self, master, view, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base 

        self.view = view
        self.enabled = False
        
        self.config(text=get_codicon(view.__icon__), relief=tk.FLAT, font=("codicon", 18), padx=10, pady=10,
            bg="#f8f8f8", fg="#626262", activebackground="#f8f8f8", activeforeground="black")
        self.pack(fill=tk.X, side=tk.TOP)
        
        self.bind('<Button-1>', self.toggle)
    
    def toggle(self, *_):
        if not self.enabled:
            self.master.set_active_slot(self)
            self.enable()
        else:
            self.disable()
        
    def enable(self):
        if not self.enabled:
            self.view.grid(column=1, row=0, sticky=NSEW, padx=(0, 1))
            self.config(fg="black")
            self.enabled = True

    def disable(self):
        if self.enabled:
            self.view.grid_remove()
            self.config(fg="#626262")
            self.enabled = False
