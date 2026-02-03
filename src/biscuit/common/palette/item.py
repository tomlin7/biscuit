from __future__ import annotations

import tkinter as tk
import typing

from ..ui import Text

if typing.TYPE_CHECKING:
    from . import Palette


class PaletteItem(Text):
    """Palette Item

    Palette Item is a text widget that represents an action that can be performed by the user.
    It is displayed in the palette and can be selected by the user using the mouse or keyboard.
    Text widget is used to highlight the search term in the item text.
    """

    def __init__(
        self, master: tk.Frame, palette: Palette, text: str, command: str, description="", *args, **kwargs
    ) -> None:
        """Initializes the Palette Item
 
        Args:
            master (tk.Frame): The parent frame
            palette (Palette): The parent palette instance
            text (str): The text to display in the item
            command (str): The command to execute when the item is selected
            description (str, optional): The description of the item. Defaults to"""

        super().__init__(master, *args, **kwargs)
        self.palette = palette
        self.text = text
        self.description = description
        self.command = command

        self.theme = self.base.theme
        self.bg, self.fg, self.hbg, self.hfg = self.theme.palette.item.values()
        
        self.config(
            font=self.base.settings.uifont,
            fg=self.fg,
            bg=self.bg,
            cursor="hand2",
            padx=15,
            pady=8,
            relief=tk.FLAT,
            highlightthickness=0,
            width=30,
            height=1,
            spacing1=2,
            spacing3=2
        )

        self.tag_config("term", foreground=self.theme.biscuit, font=self.base.settings.uifont_bold)
        self.tag_config("description", foreground=self.theme.secondary_foreground, font=self.base.settings.font)

        self.insert(tk.END, text)
        if description:
            self.insert(tk.END, f"   {description}", "description")
        self.config(state=tk.DISABLED)

        self.bind("<Button-1>", self.on_click)
        self.bind("<Enter>", self.on_hover)
        self.bind("<Leave>", self.off_hover)

        self.selected = False
        self.hovered = False

    def on_click(self, *args) -> None:
        """Executes the command when the item is clicked"""
 
        term = self.palette.searchbar.term
 
        self.palette.hide()
        self.command(term)

    def toggle_selection(self) -> None:
        """Toggles the selection state of the item"""

        if self.selected:
            self.select()
        else:
            self.deselect()

    def mark_term(self, term: str) -> None:
        """Marks the search term in the item text"""

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
