from __future__ import annotations

import tkinter as tk
import typing

if typing.TYPE_CHECKING:
    from biscuit.core.components.editors.texteditor import Text as EText

from biscuit.core.components.utils import Frame, Text, Toplevel


class HoverPopup(Toplevel):
    def __init__(self, master: EText, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.border)
        c = Frame(self, **self.base.theme.editors.hoverpopup)
        c.pack()

        self.text = Text(c, **self.base.theme.editors.text)
        self.text.pack(fill=tk.BOTH, expand=True)

        self.withdraw()

    def show(self, text: str, x: int, y: int) -> None:
        self.text.delete("1.0", tk.END)
        self.text.insert(tk.END, text)
        self.geometry(f"+{x}+{y}")
        self.deiconify()

    def hide(self, *_):
        self.withdraw()
