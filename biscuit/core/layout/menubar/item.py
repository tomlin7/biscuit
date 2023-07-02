import tkinter as tk

from core import Menu
from core.components.utils import Menubutton


class MenubarItem(Menubutton):
    def __init__(self, menubar, text, *args, **kwargs):
        super().__init__(menubar, *args, **kwargs)
        self.menubar = menubar

        self.name = text
        self.config(text=text, padx=10, pady=5, **self.base.theme.layout.menubar.item)

        self.menu = Menu(self, self.name)
        self.bind("<Button-1>", self.menu.show)
        self.bind("<Enter>", self.hover)
    
    def hover(self, *_):
        self.menubar.switch_menu(self.menu)
