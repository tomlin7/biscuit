import tkinter as tk
from tkinter.constants import *

from biscuit.core.components.utils import Frame, IconButton

from ..view import View


class SidebarView(View):
    """Base class of Sidebar views"""

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.__buttons__ = ()
        self.__icon__ = 'preview'
        self.__name__ = self.__class__.__name__

        self.pack_propagate(False)
        self.config(width=300, **self.base.theme.views.sidebar)

        self.top = Frame(self, **self.base.theme.views.sidebar)
        self.top.pack(fill=X, padx=(15, 10), pady=7)
        self.top.grid_columnconfigure(0, weight=1)

        tk.Label(self.top, text=self.__class__.__name__.upper(), anchor=W, font=("Segoi UI", 8),
                 **self.base.theme.views.sidebar.title).grid(row=0, column=0, sticky=EW)

        self.column = 1
        for i in self.__buttons__:
            IconButton(self.top, *i).grid(row=0, column=self.column, sticky=E)
            self.column += 1

    def add_button(self, icon: str, event) -> None:
        IconButton(self.top, icon, event).grid(row=0, column=self.column, sticky=E)
        self.column += 1

    def add_widget(self, widget, *args, **kwargs) -> None:
        widget.pack(fill=BOTH, expand=True, *args, **kwargs)

