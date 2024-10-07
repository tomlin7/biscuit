import tkinter as tk
import tkinter.ttk as ttk

from biscuit.common.icons import Icons
from biscuit.common.ui import ButtonsEntry, Frame

from ..sidebar_view import SideBarView
from .results import Results


class Search(SideBarView):
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
        self.__actions__ = ()  # TODO: (Icons.REFRESH,), (Icons.CLEAR_ALL,), (Icons.SHADOW_MINUS,))
        super().__init__(master, *args, **kwargs)
        self.__icon__ = Icons.SEARCH
        self.name = "Search"
        self.searchterm = tk.StringVar(self)

        self.top.pack_forget()

        self.results = Results(self, **self.base.theme.views.sidebar.item)

        self.container = Frame(self, **self.base.theme.views.sidebar)
        self.searchbox = ButtonsEntry(
            self.container,
            hint="Search",
            buttons=(
                (Icons.CASE_SENSITIVE, self.results.search_casesensitive),
                (Icons.WHOLE_WORD, self.results.search_wholeword),
                (Icons.REGEX, self.results.search_regex),
                (Icons.SEARCH, self.results.search),
            ),
        )
        self.searchbox.bind("<Return>", self.results.search)

        self.replacebox = ButtonsEntry(
            self.container,
            hint="Replace",
            buttons=((Icons.REPLACE_ALL, self.results.replace_normal),),
        )

        # TODO add ignore folders & extensions boxes

        self.container.pack(fill=tk.BOTH, padx=10, pady=5)
        self.searchbox.pack(fill=tk.X, anchor=tk.N, pady=2)
        self.replacebox.pack(fill=tk.X, side=tk.LEFT, anchor=tk.N, expand=True)

        self.results.pack(fill=tk.BOTH, expand=True, anchor=tk.N)
