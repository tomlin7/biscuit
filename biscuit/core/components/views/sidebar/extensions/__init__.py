import tkinter as tk

from biscuit.core.utils import Entry

from ..sidebarview import SidebarView
from .results import Results


class Extensions(SidebarView):
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.__icon__ = 'extensions'
        self.name = 'Extensions'

        self.searchterm = tk.StringVar(self)

        self.searchbox = Entry(self, hint="Search extensions")
        self.searchbox.pack(fill=tk.X, anchor=tk.N, padx=10, pady=7)

        self.results = Results(self)
        self.add_item(self.results)
        self.add_button('refresh', self.results.refresh)
        self.add_button('clear-all', self.results.clear)

    def initialize(self) -> None:
        self.results.refresh()
        self.results.gui_refresh_loop()
