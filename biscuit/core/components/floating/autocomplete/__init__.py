from __future__ import annotations

import tkinter as tk
import typing
from itertools import chain

if typing.TYPE_CHECKING:
    from biscuit.core.components.editors.texteditor import Text

from biscuit.core.components.utils import Toplevel

from .item import Completion
from .kinds import Kinds


class AutoComplete(Toplevel):
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(padx=1, pady=1, bg=self.base.theme.border)
        self.withdraw()
        self.overrideredirect(True)
        self.wm_attributes("-topmost", True)
        self.grid_columnconfigure(0, weight=1)
        
        self.active = False
        self.kinds = Kinds(self)
        self.menu_items: list[Completion] = []
        self.active_items: list[Completion] = []
        self.row = 0
        self.latest_tab = None
        self.selected = 0

    def add_item(self, text, kind=None):
        new_item = Completion(self, text, kind=kind)
        new_item.grid(row=self.row, sticky=tk.EW)

        self.menu_items.append(new_item)
        self.row += 1

    def remove_item(self, item: Completion):
        self.menu_items
        item.grid_forget()
        self.menu_items.remove(item)
        self.row -= 1

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

    def get_items_text(self):
        return [i.get_text() for i in self.menu_items]

    def hide_all_items(self):
        for i in self.menu_items:
            i.grid_forget()

        self.active_items = []
        self.row = 1

    def show_items(self, items, term):
        self.active_items = items
        for i in items:
            i.grid(row=self.row, sticky=tk.EW)
            self.row += 1

            i.mark_term(term)

        self.reset_selection()

    def refresh_geometry(self, tab):
        self.update_idletasks()
        self.geometry("+{}+{}".format(*tab.cursor_screen_location()))

    def show(self, tab, pos):
        self.latest_tab = tab 
        self.active = True
        self.update_idletasks()
        self.geometry("+{}+{}".format(*pos))
        self.deiconify()

    def hide(self, *_):
        self.active = False
        self.withdraw()
        self.reset()

    def reset(self):
        self.reset_selection()

    def choose(self, tab=None, this=None):
        if not self.active_items:
            return
        
        tab = tab or self.latest_tab
        this = this or self.active_items[self.selected]
        tab.confirm_autocomplete(this.get_text())
        
        self.hide()
        return "break"

    def lsp_update_completions(self, tab: Text, completions):
        self.refresh_geometry(tab)
        self.update_idletasks()

        term = tab.get_current_word()
        self.hide_all_items()

        if any(completions):
            self.show_items(completions[:10] if len(completions) > 10 else completions, term)
        else:
            self.hide()
    
    def update_completions(self, tab):
        self.refresh_geometry(tab)
        self.update_idletasks()
        self.update_all_words(tab)

        term = tab.get_current_word()

        exact, starts, includes = [], [], []
        for i in self.menu_items:
            if i.get_text() == term:
                exact.append(i)
            elif i.get_text().startswith(term):
                starts.append(i)
            elif term in i.get_text():
                includes.append(i)
        new = list(chain(exact, starts, includes))

        self.hide_all_items()
        if any(new):
            self.show_items(new[:10] if len(new) > 10 else new, term)
        else:
            self.hide()

    def move_up(self, *_):
        if self.active:
            self.select(-1)
            return "break"

    def move_down(self, *_):
        if self.active:
            self.select(1)
            return "break"

    def update_all_words(self, tab):
        for word in tab.words:
            if word not in self.get_items_text():
                self.add_item(word, "word")

        for word in self.menu_items:
            if word.get_text() not in tab.words and word.get_kind() == "word":
                self.remove_item(word)
