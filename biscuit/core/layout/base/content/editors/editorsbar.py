import tkinter as tk
from tkinter.constants import *

from core.components.utils import IconButton
from .tabs import Tabs


class Editorsbar(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.config(bg='#f8f8f8')

        self.tabs = Tabs(self)
        self.tabs.pack(fill=BOTH, side=LEFT, expand=True)

        self.buttons = []
        self.default_buttons = (('ellipsis',),)

        # TODO like panelbar, add __buttons__ to BaseEditor
        self.buttonframe = tk.Frame(self)
        self.buttonframe.base = self.base
        self.buttonframe.pack(fill=BOTH, side=RIGHT, pady=5, padx=10)
        
        for button in self.default_buttons:
            IconButton(self.buttonframe, *button).pack(side=RIGHT)

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
