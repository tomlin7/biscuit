from __future__ import annotations

import tkinter as tk
import typing

from biscuit.core.components.utils import Text

if typing.TYPE_CHECKING:
    from . import Palette

class PaletteItem(Text):
    def __init__(self, master: Palette, text: str, command: str, description="", *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.text = text
        self.description = description
        self.command  = command

        self.bg, self.fg, self.hbg, self.hfg = self.base.theme.palette.item.values()
        self.config(font=self.base.settings.uifont, fg=self.fg, bg=self.bg, cursor="hand2",
                    padx=10, pady=3, relief=tk.FLAT, highlightthickness=0, width=30, height=1)

        self.tag_config("term", foreground=self.base.theme.biscuit)
        self.tag_config("description", foreground=self.base.theme.primary_foreground)

        self.insert(tk.END, text)
        self.insert(tk.END, f" {description}", "description")
        self.config(state=tk.DISABLED)

        self.bind("<Button-1>", self.on_click)
        self.bind("<Enter>", self.on_hover)
        self.bind("<Leave>", self.off_hover)

        self.selected = False
        self.hovered = False

    def on_click(self, *args) -> None:
        self.command(self.master.searchbar.term)
        self.master.hide()

    def toggle_selection(self) -> None:
        if self.selected:
            self.select()
        else:
            self.deselect()

    def get_kind(self):
        return self.kind

    def mark_term(self, term: str) -> None:
        start_pos = self.text.lower().find(term.lower())
        end_pos = start_pos + len(term)
        self.tag_remove("term", 1.0, tk.END)
        self.tag_add("term", f"1.{start_pos}", f"1.{end_pos}")

    def on_hover(self, *args) -> None:
        if not self.selected:
            self.config(bg=self.hbg)
            self.hovered = True

    def off_hover(self, *args) -> None:
        if not self.selected:
            self.config(bg=self.bg)
            self.hovered = False

    def toggle_selection(self) -> None:
        if self.selected:
            self.select()
        else:
            self.deselect()

    def select(self) -> None:
        self.config(bg=self.hbg, fg=self.hfg)
        self.selected = True

    def deselect(self) -> None:
        self.config(bg=self.bg, fg=self.fg)
        self.selected = False
