from __future__ import annotations

import tkinter as tk
import typing

from ..actionset import ActionSet
from ..ui import Frame, Toplevel
from .item import PaletteItem
from .searchbar import Searchbar

if typing.TYPE_CHECKING:
    from src.biscuit import App


# TODO: enlarge current item, add shortcuts, secondary text
class Palette(Toplevel):
    """
    Palette

    Palette is an action menu centered horizontally and aligned to top of root.
    They contain a list of actions.
    """
    def __init__(self, master: App, width=80, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(pady=1, padx=1, bg=self.base.theme.border)

        self.container = Frame(self, **self.base.theme.palette, padx=5, pady=5)
        self.container.pack(fill=tk.BOTH)

        self.width = round(width * self.base.scale)
        self.active = False

        self.withdraw()
        self.overrideredirect(True)

        self.container.grid_columnconfigure(0, weight=1)
        self.container.grid_rowconfigure(0, weight=1)

        self.row = 1
        self.selected = 0

        self.shown_items = []

        self.actionsets = []
        self.active_set = None
        self.add_search_bar()

        self.configure_bindings()

    def register_actionset(self, actionset: ActionSet) -> None:
        """Registers an actionset to the palette
        
        Args:
            actionset (ActionSet): lambda returning the actionset instead of the actionset itself
        """
        self.actionsets.append(actionset)

    def generate_help_actionset(self) -> None:
        self.help_actionset = ActionSet("Help", "?")
        for i in self.actionsets:
            i = i() # get the actionset
            if i.prefix:
                self.help_actionset.append((i.prefix, lambda _, i=i: self.after(50, self.show, i.prefix), i.description))

        # print([i() for i in self.actionsets])
        self.register_actionset(lambda: self.help_actionset)

    def add_item(self, text: str, command, *args, **kwargs) -> PaletteItem:
        new_item = PaletteItem(self, text, command, *args, **kwargs)
        new_item.grid(row=self.row, sticky=tk.EW, in_=self.container)

        self.shown_items.append(new_item)

        self.row += 1
        self.refresh_selected()
        return new_item

    def add_search_bar(self) -> None:
        self.searchbar = Searchbar(self)
        self.searchbar.grid(row=0, sticky=tk.EW, pady=(1, 7), padx=1, in_=self.container)

    def configure_bindings(self) -> None:
        self.bind("<FocusOut>", self.hide)
        self.bind("<Escape>", self.hide)

        self.row += 1
        self.refresh_selected()

    def pick_actionset(self, actionset) -> None:
        self.active_set = actionset

    def pick_file_search(self, term: str) -> None:
        self.active_set = self.base.explorer.get_actionset(term)

    def choose(self, *_) -> None:
        if item := self.shown_items[self.selected]:
            picked_command = item.command
            term = self.searchbar.term

            self.hide()
            picked_command(term)

    def get_items(self) -> ActionSet:
        return self.active_set

    def hide(self, *args) -> None:
        self.withdraw()
        self.reset()

    def hide_all_items(self) -> None:
        for i in self.shown_items:
            i.destroy()

        self.shown_items = []
        self.row = 1

    def reset_selection(self) -> None:
        self.selected = 0
        self.refresh_selected()

    def refresh_selected(self) -> None:
        if not self.shown_items:
            return

        for i in self.shown_items:
            i.deselect()

        try:
            self.shown_items[self.selected].select()
        except IndexError as e:
            self.base.logger.error(f"Command '{self.selected}' doesnt exist: {e}")

    def reset(self) -> None:
        self.searchbar.clear()
        self.reset_selection()

    def search_bar_enter(self, *args) -> str:
        self.choose()
        return "break"

    def show_no_results(self) -> None:
        self.hide_all_items()
        self.reset_selection()
        self.add_item("No results found", lambda _:...)

    def select(self, delta: int) -> None:
        self.selected += delta
        self.selected = min(max(0, self.selected), len(self.shown_items) - 1)
        self.refresh_selected()

    def show_items(self, items: list[PaletteItem]) -> None:
        self.hide_all_items()

        for i in items[:10]:
            item = self.add_item(*i)
            item.mark_term(self.searchbar.term)

        self.reset_selection()

    def show(self, prefix: str=None, default: str=None) -> None:
        """Shows the palette with the passed prefix"""
        self.update_idletasks()
        self.update()

        x = self.master.winfo_rootx() + int((self.master.winfo_width() - self.winfo_width())/2)
        y = self.master.winfo_rooty() + self.base.menubar.searchbar.winfo_y()
        self.geometry(f"+{x}+{y}")
        self.deiconify()

        self.focus_set()
        self.searchbar.focus()
        self.searchbar.add_prefix(prefix)

        if default:
            self.searchbar.set_search_term(default)
