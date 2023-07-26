import tkinter as tk
from tkinter.constants import *

from biscuit.core.components.utils import Frame, IconButton

from .tabs import Tabs


class Editorsbar(Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.layout.base.content.editors.bar)

        self.tabs = Tabs(self)
        self.tabs.pack(fill=BOTH, side=LEFT, expand=True)

        self.buttons = []
        self.default_buttons = (('ellipsis',),)

        self.container = Frame(self, **self.base.theme.layout.base.content.editors.bar)
        self.container.pack(fill=BOTH, side=RIGHT, padx=(0, 10))
        
        for button in self.default_buttons:
            IconButton(self.container, *button).pack(side=RIGHT)

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
