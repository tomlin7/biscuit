from __future__ import annotations

import os
import tkinter as tk
import typing

from biscuit.common.icons import Icons
from biscuit.common.ui import Frame, IconButton

if typing.TYPE_CHECKING:
    from .editorsbar import EditorsBar


class TabScroll(Frame):
    """Tab scroll widget

    Tab scroll widget is used to scroll the tabs in the editors bar.
    """

    def __init__(self, master: EditorsBar, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master: EditorsBar = master
        self.config(bg=self.base.theme.border)

        self.left = IconButton(
            self,
            Icons.ARROW_LEFT,
            event=self.scroll_right,
            iconsize=12,
            padx=7,
            hfg_only=True,
        )
        self.left.config(**self.base.theme.layout.content.editors.bar)

        self.right = IconButton(
            self,
            Icons.ARROW_RIGHT,
            event=self.scroll_left,
            iconsize=12,
            padx=7,
            hfg_only=True,
        )
        self.right.config(**self.base.theme.layout.content.editors.bar)

        self.left.config(state=tk.DISABLED)
        self.right.config(state=tk.DISABLED)

        self.left.pack(side=tk.LEFT, fill=tk.BOTH)
        self.right.pack(side=tk.RIGHT, fill=tk.BOTH)

    # TODO: Implement scroll_left and scroll_right methods
    def scroll_left(self) -> None: ...
    def scroll_right(self) -> None: ...
