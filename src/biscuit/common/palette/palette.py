from __future__ import annotations

import tkinter as tk
import typing

from ..actionset import ActionSet
from ..ui import Frame, Toplevel
from .item import PaletteItem
from .searchbar import SearchBar

if typing.TYPE_CHECKING:
    from biscuit import App


# TODO: enlarge current item, add shortcuts, secondary text
class Palette(Toplevel):
    """Palette

    Palette is an action menu centered horizontally and aligned to top of root.
    It is used to display a list of actions that can be performed by the user.
    The user can search for actions and select them using the keyboard or mouse.

    Actions are registered as ActionSets, which are accessed with prefixes from search bar.
    Palette supports setting pinned actions that are displayed at the top of the palette.

    When no prefix is detected, palette turns file search mode on.
    Help is displayed when the user types '?' in the search bar.

    Palette can also be used to take input from the user, e.g: GitHub clone URL, go-to line number.
    """

    def __init__(self, master: App, width=80, *args, **kwargs) -> None:
        """Initializes the Palette

        Args:
            master (App): The main application instance
            width (int, optional): The width of the palette. Defaults to 80."""

        super().__init__(master, *args, **kwargs)
        self.config(pady=2, padx=2, bg=self.base.theme.border)

        self.container = Frame(self, **self.base.theme.palette, padx=2, pady=2)
        self.container.pack(fill=tk.BOTH, expand=True)

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

        self.searchbar = SearchBar(self)
        self.searchbar.grid(row=0, sticky=tk.EW, in_=self.container, pady=(0, 2))

        self.configure_bindings()

    def register_actionset(self, actionset_ref: ActionSet) -> None:
        """Registers an actionset to the palette
        NOTE: actionset_ref is a lambda returning the actionset instead of the actionset itself

        Args:
            actionset_ref (ActionSet): lambda returning the actionset instead of the actionset itself
        """
        self.actionsets.append(actionset_ref)

    def generate_help_actionset(self) -> None:
        """Generates the help actionset

        The help actionset is generated from the registered actionsets.
        It is displayed when the user types '?' in the search bar.
        Make sure this is called after all actionsets have been registered."""

        self.help_actionset = ActionSet("Help", "?")
        for i in self.actionsets:
            i = i()  # get the actionset
            if i.prefix:
                self.help_actionset.append(
                    (
                        i.prefix,
                        lambda _, i=i: self.after(50, self.show, i.prefix),
                        i.description,
                    )
                )

        # print([i() for i in self.actionsets])
        self.register_actionset(lambda: self.help_actionset)

    def add_item(self, text: str, command, *args, **kwargs) -> PaletteItem:
        """Adds an item to the palette

        Args:
            text (str): The text to display on the item
            command (str): The command to execute when the item is selected

        Returns:
            PaletteItem: The item that was added to the palette"""

        new_item = PaletteItem(self, text, command, *args, **kwargs)
        new_item.grid(row=self.row, sticky=tk.EW, in_=self.container)

        self.shown_items.append(new_item)

        self.row += 1
        self.refresh_selected()
        return new_item

    def configure_bindings(self) -> None:
        self.bind("<FocusOut>", self.hide)
        self.bind("<Escape>", self.hide)

        self.row += 1
        self.refresh_selected()

    def pick_actionset(self, actionset: ActionSet) -> None:
        """Picks an actionset to display in the palette

        Args:
            actionset (ActionSet): The actionset to display in the palette"""

        self.active_set = actionset

    def pick_file_search(self, term: str) -> None:
        """Picks the file search actionset

        Args:
            term (str): The search term"""

        self.active_set = self.base.explorer.get_actionset(term)

    def choose(self, *_) -> None:
        """Executes the selected item's command

        If an item is selected, the command is executed with the search term as an argument.
        """

        if item := self.shown_items[self.selected]:
            picked_command = item.command
            term = self.searchbar.term

            self.hide()
            picked_command(term)

    def get_items(self) -> ActionSet:
        return self.active_set

    def hide(self, *args) -> None:
        """Hides the palette"""

        self.withdraw()
        self.reset()

    def hide_all_items(self) -> None:
        """Hides all items in the palette"""

        for i in self.shown_items:
            i.destroy()

        self.shown_items = []
        self.row = 1

    def reset_selection(self) -> None:
        """Resets the selected item to the first item in the palette"""

        self.selected = 0
        self.refresh_selected()

    def refresh_selected(self) -> None:
        """Refreshes the selected item"""

        if not self.shown_items:
            return

        for i in self.shown_items:
            i.deselect()

        try:
            self.shown_items[self.selected].select()
        except IndexError as e:
            self.base.logger.error(f"Command '{self.selected}' doesnt exist: {e}")

    def reset(self) -> None:
        """Resets the palette

        Clears the search bar and resets the selection."""

        self.searchbar.clear()
        self.reset_selection()

    def search_bar_enter(self, *_) -> str:
        """Handles the enter key press in the search bar"""

        self.choose()
        return "break"

    def show_no_results(self) -> None:
        """Shows a 'No results found' message in the palette"""

        self.hide_all_items()
        self.reset_selection()
        self.add_item("No results found", lambda _: ...)

    def select(self, delta: int) -> None:
        """Selects an item in the palette

        Args:
            delta (int): The change in selection"""

        self.selected += delta
        self.selected = min(max(0, self.selected), len(self.shown_items) - 1)
        self.refresh_selected()

    def show_items(self, items: list[PaletteItem]) -> None:
        """Shows a list of items in the palette

        Args:
            items (list[PaletteItem]): The items to display in the palette"""

        self.hide_all_items()

        for i in items[:10]:
            item = self.add_item(*i)
            item.mark_term(self.searchbar.term)

        self.reset_selection()

    def show(self, prefix: str = None, default: str = None) -> None:
        """Shows the palette

        Args:
            prefix (str, optional): The prefix to search for. Defaults to None.
            default (str, optional): The default search term. Defaults to None."""

        self.update_idletasks()
        self.update()

        x = self.master.winfo_rootx() + int(
            (self.master.winfo_width() - self.winfo_width()) / 2
        )
        y = self.master.winfo_rooty() + int((self.master.winfo_height() / 2) - 200)
        self.geometry(f"+{x}+{y}")
        self.deiconify()

        self.focus_set()
        self.searchbar.focus()
        self.searchbar.add_prefix(prefix)

        if default:
            self.searchbar.set_search_term(default)
