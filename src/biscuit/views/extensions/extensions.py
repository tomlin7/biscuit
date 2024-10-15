import tkinter as tk

from biscuit.common.icons import Icons
from biscuit.common.ui import Entry

from ..sidebar_view import SideBarView
from .results import Results


class Extensions(SideBarView):
    """View that displays the installed extensions.

    The Extensions view displays the installed extensions.
    #TODO search for extensions
    """

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.__icon__ = Icons.EXTENSIONS
        self.name = "Extensions"

        self.searchterm = tk.StringVar(self)

        self.searchbox = Entry(self, hint="Search extensions")
        self.searchbox.pack(fill=tk.X, anchor=tk.N, padx=10, pady=7)

        self.results = Results(self)
        self.add_item(self.results)
        self.add_action(Icons.FILTER, self.results.toggle_installed)
        self.add_action(Icons.REFRESH, self.results.refresh)
        # self.add_action(Icons.CLEAR_ALL, self.results.clear)

    def initialize(self) -> None:
        self.results.refresh()
        self.results.gui_refresh_loop()
