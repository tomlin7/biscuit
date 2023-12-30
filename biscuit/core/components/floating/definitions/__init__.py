from __future__ import annotations

import tkinter as tk
import typing

from biscuit.core.components.utils import Toplevel

from .item import LocationItem

if typing.TYPE_CHECKING:
    from biscuit.core.components.editors.texteditor import Text
    from biscuit.core.components.lsp.data import Jump, JumpLocationRange


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
        self.config(padx=1, pady=1, bg=self.base.theme.border)
        self.withdraw()
        self.overrideredirect(True)
        self.wm_attributes("-topmost", True)
        
        self.latest_tab = None
        self.active = False
        self.active_items: list[LocationItem] = []

        self.bind("<FocusOut>", self.hide)
        self.bind("<Escape>", self.hide)

    def refresh_geometry(self, pos: str, tab: Text):
        tab.update_idletasks()
        
        pos_x, pos_y = tab.winfo_rootx(), tab.winfo_rooty()

        pos = tab.index(pos + " wordstart")
        bbox = tab.bbox(pos)
        if not bbox:
            return 

        bbx_x, bbx_y, _, bbx_h = bbox
        self.geometry("+{}+{}".format(pos_x + bbx_x - 1, pos_y + bbx_y + bbx_h))

    def show(self, tab: Text, jump: Jump):
        self.update_locations(jump.locations)
        self.active = True
        self.latest_tab = tab 
        
        self.refresh_geometry(jump.pos, tab)
        self.deiconify()
        self.lift()
        self.focus_set()

    def hide(self, *_):
        self.active = False
        self.withdraw()
        self.clear()
    
    def clear(self):
        for item in self.active_items:
            item.destroy()
        self.active_items = []
    
    def choose(self, path: str, start: JumpLocationRange):
        self.base.goto_location(path, start)
        self.hide()
    
    def update_locations(self, locations: list[JumpLocationRange]) -> None:
        for location in locations:
            i = LocationItem(self, location)
            i.pack(fill=tk.X, expand=True)
            self.active_items.append(i)
