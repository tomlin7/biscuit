from __future__ import annotations

import tkinter as tk
import typing

from src.biscuit.common.ui import Text, Toplevel

if typing.TYPE_CHECKING:
    from src import App
    from src.biscuit.common.textindex import TextIndex

    from .text import Text


class Diagnostic(Toplevel):
    """Diagnostic tooltip for the editor

    Shows the diagnostic message for the current word under the cursor."""

    def __init__(self, master: App, bd: int = 1, *args, **kw) -> None:
        super().__init__(master, *args, **kw)
        self.overrideredirect(True)
        self.config(bg=self.base.theme.border, bd=bd)

        self.label = tk.Label(
            self,
            padx=6,
            font=self.base.settings.font,
            anchor=tk.W,
            justify=tk.LEFT,
            **self.base.theme.editors.hover.text,
        )
        self.label.pack(fill=tk.BOTH, expand=True)

        self.withdraw()

    def update_position(self, pos: str, tab: Text):
        tab.update_idletasks()

        pos_x, pos_y = tab.winfo_rootx(), tab.winfo_rooty()

        pos = tab.index(str(pos) + " wordstart")
        bbox = tab.bbox(pos)
        if not bbox:
            return

        bbx_x, bbx_y, _, height = bbox
        self.geometry("+{}+{}".format(pos_x + bbx_x - 1, pos_y + bbx_y + height))

    def show(self, tab: Text, pos: str, response: str, severity: int) -> None:
        if not response:
            return

        self.label.config(text=response)
        self.label.pack(fill=tk.BOTH, pady=(1, 0) if response else 0)

        self.update()
        self.deiconify()
        self.update_position(pos, tab)

    def hide(self, *_) -> None:
        self.withdraw()
