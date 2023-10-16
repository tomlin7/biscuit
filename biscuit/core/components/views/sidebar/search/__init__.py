import tkinter as tk
import tkinter.ttk as ttk
from tkinter.constants import *

from biscuit.core.components.utils import ButtonsEntry, Frame, IconButton, Tree

from ..sidebarview import SidebarView
from .results import Results


class Search(SidebarView):
    def __init__(self, master, *args, **kwargs) -> None:
        self.__buttons__ = (('refresh',), ('clear-all',), ('collapse-all',))
        super().__init__(master, *args, **kwargs)
        self.__icon__ = 'search'

        self.container = Frame(self, **self.base.theme.views.sidebar)
        self.container.pack(fill=BOTH, expand=True, padx=10, pady=5)

        self.searchterm = tk.StringVar(self)

        self.searchbox = ButtonsEntry(self.container, hint="Search", buttons=(('case-sensitive',), ('whole-word',), ('regex',), ('search',),))
        self.replacebox = ButtonsEntry(self.container, hint="Replace", buttons=(('preserve-case',), ('replace-all',),))

        self.searchbox.pack(fill=X, anchor=N, pady=2)
        self.replacebox.pack(fill=X, side=LEFT, anchor=N, expand=True)

        self.results = Results(self, **self.base.theme.views.sidebar.item) 
        self.results.pack(fill=BOTH, expand=True, anchor=N)

    def replace(self) -> None:
        ...
