import tkinter as tk
import tkinter.ttk as ttk

from src.biscuit.common.ui import ButtonsEntry, Frame

from ..drawer_view import NavigationDrawerView
from .results import Results


class Search(NavigationDrawerView):
    """The Search view.

    The Search view allows the user to search for text in the active document.
    - Search for text.
    - Replace text.
    - Search with regular expressions.
    - Search case-sensitive.
    - Search whole words.
    - Clear search results.
    """

    def __init__(self, master, *args, **kwargs) -> None:
        self.__actions__ = (("refresh",), ("clear-all",), ("collapse-all",))
        super().__init__(master, *args, **kwargs)
        self.__icon__ = "search"
        self.name = "Search"
        self.searchterm = tk.StringVar(self)

        self.results = Results(self, **self.base.theme.views.sidebar.item)

        self.container = Frame(self, **self.base.theme.views.sidebar)
        self.searchbox = ButtonsEntry(
            self.container,
            hint="Search",
            buttons=(
                ("case-sensitive", self.results.search_casesensitive),
                ("whole-word", self.results.search_wholeword),
                ("regex", self.results.search_regex),
                ("search", self.results.search),
            ),
        )
        self.replacebox = ButtonsEntry(
            self.container,
            hint="Replace",
            buttons=(("replace-all", self.results.replace_normal),),
        )

        # TODO add ignore folders & extensions boxes

        self.container.pack(fill=tk.BOTH, padx=10, pady=5)
        self.searchbox.pack(fill=tk.X, anchor=tk.N, pady=2)
        self.replacebox.pack(fill=tk.X, side=tk.LEFT, anchor=tk.N, expand=True)

        self.results.pack(fill=tk.BOTH, expand=True, anchor=tk.N)
