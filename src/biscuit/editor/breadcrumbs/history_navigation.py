from __future__ import annotations

import os
import tkinter as tk
import typing

from biscuit.common.icons import Icons
from biscuit.common.ui import Frame, IconButton

if typing.TYPE_CHECKING:
    from .breadcrumbs import BreadCrumbs


class HistoryNavigation(Frame):
    """History navigation widget

    History navigation widget is used to navigate the history of the cursor
    position in the editor.
    """

    def __init__(self, master: BreadCrumbs, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master: BreadCrumbs = master
        self.config(bg=self.base.theme.border)

        self.left = IconButton(
            self,
            Icons.ARROW_LEFT,
            event=self.go_down,
            iconsize=12,
            padx=7,
            hfg_only=True,
        )
        self.left.config(**self.base.theme.editors.breadcrumbs.item)

        self.right = IconButton(
            self,
            Icons.ARROW_RIGHT,
            event=self.go_up,
            iconsize=12,
            padx=7,
            hfg_only=True,
        )
        self.right.config(**self.base.theme.editors.breadcrumbs.item)

        self.left.config(state=tk.DISABLED)
        self.right.config(state=tk.DISABLED)

        self.left.pack(side=tk.LEFT, fill=tk.BOTH)
        self.right.pack(side=tk.RIGHT, fill=tk.BOTH)

    # TODO: Implement go_up and go_down methods
    def go_up(self) -> None: ...
    def go_down(self) -> None: ...
