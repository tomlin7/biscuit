import tkinter as tk
from tkinter.constants import *

from .iconbutton import IconButton


class ButtonsEntry(tk.Frame):
    def __init__(self, master, buttons=(), *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base
        
        self.grid_columnconfigure(0, weight=1)

        self.entry = tk.Entry(self, relief=tk.FLAT, bd=5)
        self.entry.grid(row=0, column=0, sticky=tk.NSEW)

        self.column = 1
        self.add_buttons(buttons)

    def add_button(self, icon, event=lambda _: None):
        IconButton(self, icon, event).grid(row=0, column=self.column, sticky='')
        self.column += 1

    def add_buttons(self, buttons):
        for btn in buttons:
            self.add_button(*btn)
