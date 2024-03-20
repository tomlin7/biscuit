from __future__ import annotations

import typing

if typing.TYPE_CHECKING:
    from .. import EditorsPane

import tkinter as tk

from biscuit.core.components.utils import Frame, IconButton

from .menu import EditorsbarMenu
from .tabs import Tabs


class Editorsbar(Frame):
    def __init__(self, master: EditorsPane, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.layout.base.content.editors.bar)
        self.master = master

        self.tabs = Tabs(self)
        self.tabs.pack(fill=tk.BOTH, side=tk.LEFT, expand=True)

        self.menu = EditorsbarMenu(self, "tabs")
        self.menu.add_item("Show Opened Editors", lambda: self.base.palette.show("active:"))
        self.menu.add_separator(10)
        self.menu.add_item("Close All", self.master.delete_all_editors)

        self.buttons = []
        self.default_buttons = (('ellipsis', self.menu.show),)

        self.container = Frame(self, **self.base.theme.layout.base.content.editors.bar)
        self.container.pack(fill=tk.BOTH, side=tk.RIGHT, padx=(0, 10))

        for button in self.default_buttons:
            IconButton(self.container, *button).pack(side=tk.RIGHT)

    def add_buttons(self, buttons: list[IconButton]) -> None:
        for button in buttons:
            button.pack(side=tk.LEFT)
            self.buttons.append(button)

    def replace_buttons(self, buttons: list[IconButton]) -> None:
        self.clear()
        self.add_buttons(buttons)

    def clear(self) -> None:
        for button in self.buttons:
            button.pack_forget()
        self.buttons.clear()

