from __future__ import annotations

import tkinter as tk
import typing
from itertools import chain

from ..ui import Frame

if typing.TYPE_CHECKING:
    from . import Palette


class SearchBar(Frame):
    """Search Bar

    It is used to filter actions based on the search term entered by the user.
    The search bar can be used to search for actions, files, or take input from the user.
    """

    def __init__(self, master: Palette, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master: Palette = master
        theme = self.base.theme
        self.config(bg=theme.palette['background'])
        self.term = ""

        self.text_variable = tk.StringVar()
        self.text_variable.trace_add("write", self.filter)

        self.search_bar = tk.Entry(
            self,
            font=self.base.settings.uifont,
            width=self.master.width,
            relief=tk.FLAT,
            textvariable=self.text_variable,
            bg=theme.secondary_background,
            fg=theme.biscuit,
            insertbackground=theme.biscuit,
            highlightthickness=1,
            highlightbackground=theme.border,
            highlightcolor=theme.biscuit
        )

        self.search_bar.pack(fill=tk.X, padx=5, pady=5, ipady=5)
        self.configure_bindings()

    def configure_bindings(self) -> None:
        self.search_bar.bind("<Return>", self.master.search_bar_enter)

        self.search_bar.bind("<Down>", lambda e: self.master.select(1))
        self.search_bar.bind("<Up>", lambda e: self.master.select(-1))

    def clear(self) -> None:
        self.text_variable.set("")

    def focus(self) -> None:
        self.search_bar.focus()

    def add_prefix(self, prefix: str = None) -> None:
        """Adds a prefix to the search bar text

        Args:
            prefix (str, optional): The prefix to add. Defaults to None."""

        self.prefix = prefix
        self.text_variable.set(prefix + " " if prefix else "")
        self.search_bar.icursor(tk.END)

    def set_search_term(self, term: str) -> None:
        """Sets the search term

        Args:
            term (str): The search term to set"""

        self.search_bar.focus_set()
        self.text_variable.set(self.search_bar.get() + term)
        self.search_bar.select_range(len(self.prefix), tk.END)
        self.search_bar.icursor(tk.END)

    def get_search_term(self) -> str:
        return self.search_bar.get().lower()

    def filter(self, *args) -> None:
        """Filters the actions based on the search term

        The search term is used to filter the actions based on the following criteria:
        - Exact match
        - Starts with
        - Includes

        If no actions are found, the no results message is displayed."""

        term = self.get_search_term()

        prefix_found = False
        for actionset in self.master.actionsets:
            actionset = actionset()
            if term.startswith(actionset.prefix):
                self.master.pick_actionset(actionset)
                term = term[len(actionset.prefix) :].strip()

                prefix_found = True
                break

        self.term = term
        if not prefix_found:
            self.master.pick_file_search(term)

        exact, starts, includes = [], [], []
        temp = term.lower()
        for i in self.master.active_set:
            if not i or not i[0]:
                continue

            item = i[0].lower()
            if item == temp:
                exact.append(i)
            elif item.startswith(temp):
                starts.append(i)
            elif temp in item:
                includes.append(i)

        new = list(chain(actionset.get_pinned(term), exact, starts, includes))
        if any(new):
            self.master.show_items(new)
        else:
            self.master.show_no_results()
