from __future__ import annotations

import os
import tkinter as tk
import typing
from collections import defaultdict

from biscuit.common.ui import Frame, Label, Toplevel

from ..text import TextEditor
from .tree import PeekTree

if typing.TYPE_CHECKING:
    from biscuit.editor.text import Text
    from biscuit.language.data import Jump, JumpLocationRange


class Peek(Toplevel):
    """Floating window for peeking definitions, declarations, and references.

    Peek is triggered only by the LSP client, and it shows a list of locations
    where the symbol is defined, declared, or referenced.
    There is a preview pane for peeking the content of the selected location
    without switching tabs. Hence it's called peek!

    Peek fills the width of the tab and is placed right below the cursor.
    TODO: Peek renders on top of the tab, so the lines behind it are not visible.
    So skip the space taken by peek's height and render lines below it.
    """

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(padx=0, pady=1, bg=self.base.theme.biscuit)
        self.withdraw()
        self.overrideredirect(True)
        self.wm_attributes("-topmost", True)

        container = Frame(self, **self.base.theme.editors)
        container.pack(fill=tk.X, pady=(0, 1))

        self.filename = Label(
            container,
            font=self.base.settings.uifont,
            **self.base.theme.editors.labels,
            anchor=tk.W,
        )
        self.filename.pack(fill=tk.X, side=tk.LEFT)
        self.path = Label(
            container,
            font=self.base.settings.uifont,
            **self.base.theme.editors.labels,
            anchor=tk.W,
        )
        self.path.config(fg=self.base.theme.primary_foreground)
        self.path.pack(fill=tk.X, side=tk.LEFT)

        self.tree = PeekTree(
            self, width=100, singleclick=self.switch_editor, doubleclick=self.choose
        )

        self.editor = TextEditor(self, standalone=True, minimalist=True)
        self.tree.pack(side=tk.LEFT, fill=tk.Y)
        self.editor.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.latest_tab = None
        self.mousein = False
        self.active = False

        self.editor.text.bind("<Double-Button-1>", self.choose)
        self.bind("<Enter>", lambda _: setattr(self, "mousein", True))
        self.bind("<Leave>", lambda _: setattr(self, "mousein", False))
        self.bind("<FocusOut>", self.hide)
        self.bind("<Escape>", self.hide)

    def refresh_geometry(self, pos: str, tab: Text):
        """Refresh the geometry of the window.

        The window is placed right below the cursor, and the widget fills the
        width of the tab.

        Args:
            pos (str): The position of the cursor.
            tab (Text): The current tab."""

        tab.update_idletasks()

        pos_x, pos_y = tab.master.winfo_rootx(), tab.master.winfo_rooty()

        pos = tab.index(pos + " linestart")
        bbox = tab.bbox(pos)
        if not bbox:
            return

        bbx_x, bbx_y, _, bbx_h = bbox
        self.geometry(
            "{}x{}+{}+{}".format(
                tab.master.winfo_width(), 250, pos_x, pos_y + bbx_y + bbx_h
            )
        )

    def show(self, tab: Text, jump: Jump):
        """Show the definitions window.

        Args:
            tab (Text): The current tab.
            jump (Jump): The Jump object."""

        self.update_locations(jump.locations)
        if jump.locations:
            path = jump.locations[0].file_path
            self.editor.text.load_new_file(path)
            self.editor.bind(
                "<<FileLoaded>>",
                lambda _, pos=jump.locations[0].start: self.refresh_and_goto(pos),
            )
            self.filename.set_text(os.path.basename(path))
            self.path.set_text(os.path.dirname(path))

        self.active = True
        self.latest_tab = tab

        self.refresh_geometry(jump.pos, tab)
        self.deiconify()
        self.lift()
        self.focus_set()

    def hide(self, *_):
        """Hide the definitions window."""

        if self.mousein:
            return

        self.active = False
        self.withdraw()
        self.clear()
        self.editor.clear()

    def force_hide(self):
        """Force hide peek."""

        self.active = False
        self.withdraw()
        self.clear()
        self.editor.clear()

    def clear(self):
        """Clear the list of locations."""

        self.tree.delete(*self.tree.get_children())

    def switch_editor(self, *_):
        """Switch the editor to the selected item."""

        try:
            path, start = self.tree.item(self.tree.focus())["values"]
        except ValueError:
            return

        self.editor.text.load_new_file(path)
        self.editor.bind(
            "<<FileLoaded>>", lambda _, pos=start: self.refresh_and_goto(pos)
        )
        self.filename.set_text(os.path.basename(path))
        self.path.set_text(os.path.dirname(path))

    def refresh_and_goto(self, pos: str):
        """Refresh the editor and go to the position.

        Args:
            pos (str): The position to go to."""

        self.editor.text.focus_set()
        self.editor.text.goto(pos)
        self.editor.text.refresh()

    def choose(self, *_):
        """Choose the selected item and go to the location."""

        try:
            path, start = self.tree.item(self.tree.focus())["values"]
        except ValueError:
            return

        self.base.goto_location(path, start)
        self.force_hide()

    def update_locations(self, locations: list[JumpLocationRange]) -> None:
        """Update the list of locations."""

        groups: dict[str, list[JumpLocationRange]] = defaultdict(list)
        for location in locations:
            groups[location.file_path].append(location)

        for path, locations in groups.items():
            if len(locations) > 1:
                i = self.tree.insert(
                    "",
                    "end",
                    text=os.path.basename(path),
                    values=(path, locations[0].start),
                    open=True,
                    image="document",
                )
                for loc in locations:
                    self.tree.insert(i, "end", text=loc.start, values=(path, loc.start))
            else:
                self.tree.insert(
                    "",
                    "end",
                    text=os.path.basename(path),
                    values=(path, locations[0].start),
                    image="document",
                )
