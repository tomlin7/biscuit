import tkinter as tk
from tkinter.constants import *

from .....components.utils import IconButton
from .tabs import Tabs


class Panelbar(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.config(bg='white')

        self.tabs = Tabs(self)
        self.tabs.pack(fill=tk.X, side=LEFT, expand=True)

        self.buttons = []
        self.default_buttons = (('close',), ('chevron-up',))
        
        for button in self.default_buttons:
            IconButton(self, *button, bg='white').pack(side=RIGHT)

    def add_buttons(self, buttons):
        for button in buttons:
            button.pack(side=LEFT)
            self.buttons.append(button)
    
    def replace_buttons(self, buttons):
        self.clear()
        self.add_buttons(buttons)
        
    def clear(self):
        for button in self.buttons:
            button.pack_forget()
        self.buttons.clear()
