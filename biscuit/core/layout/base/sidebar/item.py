from __future__ import annotations

import typing

if typing.TYPE_CHECKING:
    from .. import Sidebar

import tkinter as tk

from biscuit.core.utils import Bubble, Menubutton, get_codicon

from .menu import ActionbarMenu


class MenuItem(Menubutton):
    def __init__(self, master: Sidebar, icon: str, text: str, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.bubble = Bubble(self, text=text)
        self.config(text=get_codicon(icon), relief=tk.FLAT, font=("codicon", 20), cursor="hand2",
                    padx=10, pady=10, **self.base.theme.layout.base.sidebar.slots.slot)
        self.pack(fill=tk.X, side=tk.TOP)

        self.menu = ActionbarMenu(self, icon)
        self.bind("<Button-1>", self.menu.show)
        self.bind("<Enter>", self.hover)
        self.bind('<Leave>', self.bubble.hide)

    def hover(self, *_) -> None:
        self.master.switch_menu(self.menu)
        self.bubble.show()
