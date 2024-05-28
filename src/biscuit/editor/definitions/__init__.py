from __future__ import annotations

import os
import tkinter as tk
import typing
from collections import defaultdict

from src.biscuit.utils import Frame, Label, Toplevel, icon

from .tree import DefinitionsTree

if typing.TYPE_CHECKING:
    from src.biscuit.components.editors.texteditor import Text
    from src.biscuit.components.lsp.data import Jump, JumpLocationRange


class Definitions(Toplevel):
    """Floating window for lsp goto-definition requests, in cases where multiple definitions are found.
    
    Methods:
        - show(tab, jump)
        - hide()
        - clear()

    Attributes:
        - active
        - active_items
        - latest_tab
    """

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(padx=0, pady=1, bg=self.base.theme.biscuit)
        self.withdraw()
        self.overrideredirect(True)
        self.wm_attributes("-topmost", True)

        container = Frame(self)
        container.pack(fill=tk.X, pady=(0, 1))
    
        self.filename = Label(container, font=("Segoe UI", 12), **self.base.theme.editors.labels, anchor=tk.W)
        self.filename.pack(fill=tk.X, side=tk.LEFT)
        self.path = Label(container, font=("Segoe UI", 10), **self.base.theme.editors.labels, anchor=tk.W)
        self.path.config(fg=self.base.theme.primary_foreground)
        self.path.pack(fill=tk.X, side=tk.LEFT)

        self.tree = DefinitionsTree(self, width=100, singleclick=self.switch_editor, doubleclick=self.choose)
        self.tree.pack(side=tk.LEFT, fill=tk.Y)

        from src.biscuit.components.editors.texteditor import TextEditor
        self.editor = TextEditor(self, standalone=True)
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
        """Refresh the geometry of the window."""

        tab.update_idletasks()
        
        pos_x, pos_y = tab.winfo_rootx(), tab.winfo_rooty()

        pos = tab.index(pos + " linestart")
        bbox = tab.bbox(pos)
        if not bbox:
            return 

        bbx_x, bbx_y, _, bbx_h = bbox
        self.geometry("+{}+{}".format(pos_x + bbx_x - 1, pos_y + bbx_y + bbx_h))
        self.geometry("{}x{}".format(tab.winfo_width(), 200))

    def show(self, tab: Text, jump: Jump):
        """Show the definitions window."""

        self.update_locations(jump.locations)
        if jump.locations:
            path = jump.locations[0].file_path
            self.editor.text.load_new_file(path)
            self.editor.bind("<<FileLoaded>>", lambda _, pos=jump.locations[0].start: self.refresh_and_goto(pos))
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
        """Force hide the definitions window."""

        self.active = False
        self.withdraw()
        self.clear()
        self.editor.clear()
    
    def clear(self):
        """Clear all active items."""

        self.tree.delete(*self.tree.get_children())

    def switch_editor(self, *_):
        """Switch editor to open selected file."""

        try:
            path, start = self.tree.item(self.tree.focus())["values"]
        except ValueError:
            return
        
        self.editor.text.load_new_file(path)
        self.editor.bind("<<FileLoaded>>", lambda _, pos=start: self.refresh_and_goto(pos))
        self.filename.set_text(os.path.basename(path))
        self.path.set_text(os.path.dirname(path))
        
    def refresh_and_goto(self, pos: str):
        """Refresh the editor and go to the given position."""

        self.editor.text.focus_set()
        self.editor.text.goto(pos)
        self.editor.text.refresh()
    
    def choose(self, *_):
        """Choose a definition and go to it."""

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
                i = self.tree.insert("", "end", text=os.path.basename(path), values=(path, locations[0].start), open=True, image='document')
                for loc in locations:
                    self.tree.insert(i, "end", text=loc.start, values=(path, loc.start))
            else:
                self.tree.insert("", "end", text=os.path.basename(path), values=(path, locations[0].start), image='document')
