from __future__ import annotations

import tkinter as tk
import typing

from biscuit.core import Menu
from biscuit.core.components.utils import Menubutton

if typing.TYPE_CHECKING:
    from .. import Menubar


class MenubarItem(Menubutton):
    def __init__(self, master: Menubar, text, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master = master

        self.name = text
        self.config(text=text, padx=10, pady=5, font=("Segoi UI", 11), **self.base.theme.layout.menubar.item)

        self.menu = Menu(self, self.name)
        self.bind("<Button-1>", self.menu.show)
        self.bind("<Enter>", self.hover)
    
    def hover(self, *_):
        self.master.switch_menu(self.menu)
