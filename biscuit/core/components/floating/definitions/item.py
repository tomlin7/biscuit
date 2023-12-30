from __future__ import annotations

import os
import tkinter as tk
import typing

from biscuit.core.components.utils.menubutton import Menubutton

if typing.TYPE_CHECKING:
    from biscuit.core.components.floating.definitions import Definitions
    from biscuit.core.components.lsp.data import JumpLocationRange


class LocationItem(Menubutton):
    def __init__(self, master: Definitions, location: JumpLocationRange, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.path = location.file_path
        self.start = location.start
        self.config(text=f"{os.path.basename(location.file_path)} ({'/'.join(os.path.dirname(location.file_path).split(os.sep)[:-2])})", anchor=tk.W, justify=tk.LEFT, **self.base.theme.editors.definitions.item)
        self.bind("<Button-1>", self.choose)

    def choose(self, _):
        self.master.choose(self.path, self.start)
