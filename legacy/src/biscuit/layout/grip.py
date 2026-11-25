from __future__ import annotations

import tkinter as tk
import typing

if typing.TYPE_CHECKING:
    from .root import Root


class Grip(tk.Frame):
    """A grip to resize the application

    - Can be placed on the left, right, top, or bottom of the application
    """

    def __init__(self, base: Root, side: str, cursor: str, *args, **kwargs) -> None:
        super().__init__(base, *args, **kwargs)
        self.base = base
        self.side = side
        self.config(bg=self.base.base.theme.border, cursor=cursor)
        self.bind("<B1-Motion>", lambda _: self.base.base.resize(self.side))
