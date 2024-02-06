from __future__ import annotations

import tkinter as tk
import typing
from itertools import chain

from biscuit.core.components.utils import Frame

if typing.TYPE_CHECKING:
    from . import Palette

class Searchbar(Frame):
    def __init__(self, master: Palette, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.biscuit)

        self.text_variable = tk.StringVar()
        self.text_variable.trace_add("write", self.filter) 

        frame = Frame(self, **self.base.theme.palette)
        frame.pack(fill=tk.BOTH, padx=1, pady=1)

        self.search_bar = tk.Entry(
            frame, font=("Segoe UI", 10), width=self.master.width, relief=tk.FLAT, 
            textvariable=self.text_variable, **self.base.theme.palette.searchbar)

        self.search_bar.grid(sticky=tk.EW, padx=5, pady=3)
        self.configure_bindings()

        self.term: str

    def configure_bindings(self) -> None:
        self.search_bar.bind("<Return>", self.master.search_bar_enter)

        self.search_bar.bind("<Down>", lambda e: self.master.select(1))
        self.search_bar.bind("<Up>", lambda e: self.master.select(-1))

    def clear(self) -> None:
        self.text_variable.set("")

    def focus(self) -> None:
        self.search_bar.focus()

    def add_prompt(self, prompt: str) -> None:
        self.text_variable.set(prompt + " ")
        self.search_bar.icursor(tk.END)

    def get_search_term(self) -> str:
        return self.search_bar.get().lower()

    def filter(self, *args) -> None:
        term = self.get_search_term()

        prompt_found = False
        for actionset in self.master.actionsets:
            actionset = actionset()
            if term.startswith(actionset.prompt):
                self.master.pick_actionset(actionset)
                term = term[len(actionset.prompt):].strip()

                prompt_found = True
                break

        self.term = term
        if not prompt_found:
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
