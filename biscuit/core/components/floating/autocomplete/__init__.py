from __future__ import annotations

import re
import tkinter as tk
import typing
from itertools import chain

if typing.TYPE_CHECKING:
    from biscuit.core.components.editors.texteditor import Text
    from biscuit.core.components.lsp.data import Completion, Completions

from biscuit.core.components.utils import Toplevel

from .item import CompletionItem


class AutoComplete(Toplevel):
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(padx=1, pady=1, bg=self.base.theme.border)
        self.withdraw()
        self.overrideredirect(True)
        self.wm_attributes("-topmost", True)
        
        self.lsp_mode = False
        self.latest_tab = None
        self.active = False
        self.selected = 0
        self.row = 0

        self.menu_items: list[CompletionItem] = [CompletionItem(self) for _ in range(10)]
        self.active_items: list[CompletionItem] = []

        self.row = 1

    def refresh_geometry(self, tab: Text):
        self.update_idletasks()
        self.geometry("+{}+{}".format(*tab.cursor_screen_location()))

    def show(self, tab: Text):
        self.latest_tab = tab 
        self.active = True
        self.update_idletasks()
        self.deiconify()

    def hide(self, *_):
        self.active = False
        self.withdraw()
        self.reset()

    def reset(self):
        self.reset_selection()
    
    def choose(self, tab: Text=None, this=None):
        if not self.active_items:
            return
        
        tab = tab or self.latest_tab
        
        this = this or self.active_items[self.selected]
        if self.lsp_mode:
            tab.replace(this.replace_start, this.replace_end, this.replace_text)
        else:
            tab.replace_current_word(this.replace_text)

        self.hide()
        return "break"
    
    def lsp_set_active_items(self, completions: list[Completion], term: str):
        while len(self.active_items) > len(completions):
            i = self.active_items.pop()
            i.grid_forget()
            self.menu_items.append(i)
        
        while len(self.active_items) < len(completions):
            i = self.menu_items.pop()
            i.grid(row=self.row, column=0, sticky="nsew")
            self.active_items.append(i)
            self.row += 1

        # now we have the same amount of items as completions
        for i, completion in enumerate(completions):
            self.active_items[i].lsp_set_data(completion, term)
    
    def set_active_items(self, words: list[str], term: str):
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
        while self.active_items:
            i = self.active_items.pop()
            i.grid_forget()
            self.menu_items.append(i)

    def lsp_update_completions(self, tab: Text, completions: Completions) -> None:
        self.refresh_geometry(tab)

        term = tab.get_current_word()
        if completions:
            self.lsp_set_active_items(completions[:10], term)
            self.show(tab)
        else:
            self.hide()
    
    def update_completions(self, tab: Text):
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
            self.set_active_items(new[:10], term)
            self.show(tab)
        else:
            self.hide()

    def select(self, delta):
        self.selected += delta
        if self.selected > len(self.active_items) - 1:
            self.selected = 0
        elif self.selected < 0:
            self.selected = len(self.active_items) - 1
        self.refresh_selected()

    def reset_selection(self):
        self.selected = 0
        self.refresh_selected()

    def refresh_selected(self):
        for i in self.active_items:
            i.deselect()
        if self.selected < len(self.active_items):
            self.active_items[self.selected].select()
    
    def move_up(self, *_):
        if self.active:
            self.select(-1)
            return "break"

    def move_down(self, *_):
        if self.active:
            self.select(1)
            return "break"
