from __future__ import annotations

import typing

from biscuit.common import Menu
from biscuit.common.ui import Menubutton

if typing.TYPE_CHECKING:
    from . import Menubar


class MenubarItem(Menubutton):
    def __init__(self, master: Menubar, text, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.name = text
        self.config(
            text=text,
            padx=10,
            pady=5,
            font=("Segoi UI", 11),
            **self.base.theme.layout.menubar.item,
        )

        self.menu = Menu(self, self.name)
        self.bind("<<Hide>>", self.deselect)
        self.bind("<Button-1>", self.onclick)
        self.bind("<Enter>", self.hover)

    def onclick(self, *_):
        self.menu.show()
        self.select()

    def hover(self, *_):
        self.master.switch_menu(self)

    def select(self):
        self.config(bg=self.base.theme.layout.menubar.item.highlightbackground)

    def deselect(self, *_):
        self.config(bg=self.base.theme.layout.menubar.item.background)
