import tkinter as tk
from tkinter.constants import *

from core.components.utils import get_codicon, Bubble, Menubutton


class Slot(Menubutton):
    def __init__(self, master, view, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.view = view
        self.enabled = False

        self.bubble = Bubble(self, text=view.__icon__)
        self.bind('<Enter>', self.bubble.show)
        self.bind('<Leave>', self.bubble.hide)
        
        self.config(text=get_codicon(view.__icon__), relief=tk.FLAT, font=("codicon", 20), 
                    padx=13, pady=11, **self.base.theme.layout.base.sidebar.slots.slot)
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
            self.config(fg=self.base.theme.layout.base.sidebar.slots.slot.selectedforeground)
            self.enabled = True

    def disable(self):
        if self.enabled:
            self.view.grid_remove()
            self.config(fg=self.base.theme.layout.base.sidebar.slots.slot.foreground)
            self.enabled = False
