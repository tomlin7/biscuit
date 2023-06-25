import tkinter as tk
from tkinter.constants import *

from .iconbutton import IconButton
from hintedtext import HintedEntry

class ButtonsEntry(tk.Frame):
    def __init__(self, master, hint="", buttons=(), *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base
        
        self.config(padx=1, pady=1, bg='#dfdfdf')
        self.grid_columnconfigure(0, weight=1)

        self.entry = HintedEntry(self, relief=tk.FLAT, bd=5, hint=hint)
        self.entry.grid(row=0, column=0, sticky=tk.NSEW)

        self.column = 1
        self.add_buttons(buttons)

    def add_button(self, icon, event=lambda _: None):
        IconButton(self, icon, event, bg='white').grid(row=0, column=self.column, sticky='')
        self.column += 1

    def add_buttons(self, buttons):
        for btn in buttons:
            self.add_button(*btn)
