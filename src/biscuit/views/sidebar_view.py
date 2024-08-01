import tkinter as tk
import typing

from biscuit.common.ui import Frame, IconButton

from .sidebar_item import SideBarViewItem
from .view import View


class SideBarView(View):
    """Abstract class for creating a sidebar view."""

    __actions__ = []

    def __init__(
        self, master, name: str = None, icon: str = "preview", *args, **kwargs
    ) -> None:
        super().__init__(master, *args, **kwargs)
        self.__icon__ = icon
        self.name = name
        self.__name__ = self.__class__.__name__

        self.pack_propagate(False)
        self.config(width=300, **self.base.theme.views.sidebar)

        self.top = Frame(self, **self.base.theme.views.sidebar)
        self.top.pack(fill=tk.X, padx=(15, 10), pady=7)
        self.top.grid_columnconfigure(0, weight=1)

        tk.Label(
            self.top,
            text=name.upper() if name else self.__class__.__name__.upper(),
            anchor=tk.W,
            font=self.base.settings.uifont,
            **self.base.theme.views.sidebar.title
        ).grid(row=0, column=0, sticky=tk.EW)

        self.column = 1
        if not self.__actions__:
            return

        for i in self.__actions__:
            IconButton(self.top, *i).grid(row=0, column=self.column, sticky=tk.E)
            self.column += 1

    def add_action(self, icon: str, event) -> None:
        IconButton(self.top, icon, event).grid(row=0, column=self.column, sticky=tk.E)
        self.column += 1

    def add_item(self, widget, fill=tk.BOTH, expand=True, *args, **kwargs) -> None:
        widget.pack(fill=fill, expand=expand, *args, **kwargs)

    def remove_item(self, widget) -> None:
        widget.pack_forget()

    def create_item(self, name: str = None):
        item = SideBarViewItem(self, name)
        self.add_item(item)
        return item
