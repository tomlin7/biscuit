from __future__ import annotations

import re
import tkinter as tk
import typing
from itertools import chain

if typing.TYPE_CHECKING:
    from biscuit.editor.text import Text
    from biscuit.language.data import Completion, Completions

from biscuit.common.ui import Toplevel

from .item import CompletionItem


class AutoComplete(Toplevel):
    """Floating window for autocomplete suggestions.

    In lsp mode, it receives completions from the language server.
    In regular mode, it generates completions from the current tab's words.

    NOTE: As of now, the window is limited to 10 items, not scrollable."""

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(padx=2, pady=2, bg=self.base.theme.primary_background_highlight)
        self.withdraw()
        self.overrideredirect(True)
        self.wm_attributes("-topmost", True)

        self.lsp_mode = False
        self.latest_tab = None
        self.active = False
        self.selected = 0
        self.row = 0

        # 10 items are created and stored in menu_items, then moved to active_items
        # when needed. This is to avoid creating and destroying items on every update.
        self.menu_items: list[CompletionItem] = [
            CompletionItem(self) for _ in range(10)
        ]
        self.active_items: list[CompletionItem] = []

        self.row = 1

    def refresh_geometry(self, tab: Text) -> None:
        """Refresh the position of the autocomplete window.

        The window is placed right below the cursor, and it's width is
        adjusted to the longest item in the list.

        Args:
            tab (Text): The current tab."""

        self.update_idletasks()
        self.geometry("+{}+{}".format(*tab.cursor_screen_location()))

    def show(self, tab: Text) -> None:
        """Show the autocomplete window.

        Args:
            tab (Text): The current tab."""

        self.latest_tab = tab
        self.active = True
        self.update_idletasks()
        self.deiconify()

    def hide(self, *_):
        """Hide the autocomplete window."""

        self.active = False
        self.withdraw()
        self.reset()

    def reset(self):
        """Reset the autocomplete window for the next use."""

        self.reset_selection()

    def choose(self, tab: Text = None, this: CompletionItem = None):
        """Choose the currently selected item.

        Args:
            tab (Text, optional): The current tab. Defaults to latest_tab.
            this (CompletionItem, optional): The currently selected item. Defaults to selected item.
        """

        if not self.active_items:
            return

        tab = tab or self.latest_tab
        this = this or self.active_items[self.selected]

        # the language server provides the indices and word to replace with
        if self.lsp_mode:
            tab.replace(this.replace_start, this.replace_end, this.replace_text)
        else:
            tab.replace_current_word(this.replace_text)

        self.hide()
        return "break"

    def lsp_set_active_items(self, completions: list[Completion], term: str):
        """Set the active items with completions received from the language server.
        This is a helper function for lsp_update_completions.

        Args:
            completions (list[Completion]): The list of completions.
            term (str): The current word to complete."""

        # remove amount of items that are not needed
        while len(self.active_items) > len(completions):
            i = self.active_items.pop()
            i.grid_forget()
            self.menu_items.append(i)

        # add amount of items that are extra needed
        while len(self.active_items) < len(completions):
            i = self.menu_items.pop()
            i.grid(row=self.row, column=0, sticky="nsew")
            self.active_items.append(i)
            self.row += 1

        # now we have the same amount of items as completions
        # set the data for each item
        for i, completion in enumerate(completions):
            self.active_items[i].lsp_set_data(completion, term)

    def set_active_items(self, words: list[str], term: str):
        """Normal mode: Set the active items with words generated from the current tab.
        This is a helper function for update_completions.

        Args:
            words (list[str]): The list of words.
            term (str): The current word to complete."""

        while len(self.active_items) > len(words):
            i = self.active_items.pop()
            i.grid_forget()
            self.menu_items.append(i)

        while len(self.active_items) < len(words):
            i = self.menu_items.pop()
            i.grid(row=self.row, column=0, sticky="nsew")
            self.active_items.append(i)
            self.row += 1

        # now we have the same amount of items as words
        for i, word in enumerate(words):
            self.active_items[i].set_data(word, term)

    def clear(self) -> None:
        """Clear the active items and move them back to menu_items."""

        while self.active_items:
            i = self.active_items.pop()
            i.grid_forget()
            self.menu_items.append(i)

    def lsp_update_completions(self, tab: Text, completions: Completions) -> None:
        """Update the completions with the data received from the language server.

        Args:
            tab (Text): The current tab.
            completions (Completions): The completions received from the language server.
        """

        self.refresh_geometry(tab)

        term = tab.get_current_word()
        if completions:
            self.lsp_mode = True
            self.lsp_set_active_items(completions[:10], term)
            self.show(tab)
        else:
            self.hide()

    def update_completions(self, tab: Text):
        """Update the completions with words generated from the current tab.
        The words are filtered and prioritized based on exact match, starts with, and includes.

        Args:
            tab (Text): The current tab."""

        self.refresh_geometry(tab)

        term = tab.get_current_word()

        # term is too short
        if len(term) < 2:
            self.hide()
            return

        exact, starts, includes = [], [], []
        for word in tab.words:
            if word == term:
                exact.append(word)
            elif word.startswith(term):
                starts.append(word)
            elif term in word:
                includes.append(word)
        new = list(chain(exact, starts, includes))

        if new:
            self.lsp_mode = False
            self.set_active_items(new[:10], term)
            self.show(tab)
        else:
            self.hide()

    def select(self, delta):
        """Select the next or previous item.

        Args:
            delta (int): The direction to move the selection."""

        self.selected += delta
        if self.selected > len(self.active_items) - 1:
            self.selected = 0
        elif self.selected < 0:
            self.selected = len(self.active_items) - 1
        self.refresh_selected()

    def reset_selection(self):
        """Reset the selected item to the first one."""

        self.selected = 0
        self.refresh_selected()

    def refresh_selected(self):
        """Refresh the selected item."""

        for i in self.active_items:
            i.deselect()
        if self.selected < len(self.active_items):
            self.active_items[self.selected].select()

    def move_up(self, *_):
        """Move the selection up."""

        if self.active:
            self.select(-1)
            return "break"

    def move_down(self, *_):
        """Move the selection down."""

        if self.active:
            self.select(1)
            return "break"
