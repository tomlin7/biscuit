import tkinter as tk
from tkinter.constants import *


#TODO convert to a frame
# add icon, label, closebutton
class Tab(tk.Menubutton):
    """
    +-------------------+
    | 🤍 FILENAME     X |
    +-------------------+
    """    
    def __init__(self, master, editor, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.editor = editor
        self.selected = False
        
        self.config(text=editor.filename, padx=5, pady=5,
            font=("Segoe UI", 10), bg="#f2f2f2", activebackground="white")

        self.bind('<Button-1>', self.select)

    def deselect(self, *_):
        if self.selected:
            self.editor.grid_remove()
            self.config(bg="#f2f2f2")
            self.selected = False
        
    def select(self, *_):
        if not self.selected:
            self.master.set_active_tab(self)
            self.editor.grid(column=0, row=1, sticky=NSEW)
            self.config(bg="white")
            self.selected = True
