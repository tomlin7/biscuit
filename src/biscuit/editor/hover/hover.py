from __future__ import annotations

import tkinter as tk
import typing

from biscuit.common.ui import Frame
from biscuit.common.ui import Text as TextW
from biscuit.common.ui import Toplevel

from .renderer import HoverRenderer

if typing.TYPE_CHECKING:
    from biscuit.language.data import HoverResponse
    from src import App

    from ..text import Text


def codeblock(text: str, language: str) -> str:
    return f"```{language}\n{text}\n```\n\n---\n\n"


class Hover(Toplevel):
    def __init__(self, master: App, bd: int = 2, *args, **kw) -> None:
        super().__init__(master, *args, **kw)
        self.overrideredirect(True)
        self.maxsize(600, 200)
        self.config(bg=self.base.theme.primary_background_highlight, bd=bd)

        container = Frame(self, bg=self.base.theme.border)
        container.pack(fill=tk.BOTH, expand=True)

        self.renderer = HoverRenderer(container)
        self.renderer.pack(fill=tk.BOTH, expand=True)

        self.withdraw()

    def calculate_size(self, docs: str) -> tuple[int, int]:
        """Calculate responsive width and height based on documentation text length and lines."""
        lines = docs.strip().split("\n")
        line_count = len(lines)
        max_line_len = max((len(l) for l in lines), default=20)

        width = min(max(max_line_len * 8 + 30, 220), 550)
        height = min(max(line_count * 22 + 40, 50), 220)
        return width, height

    def update_position(self, pos: str, tab: Text, width: int | None = None, height: int | None = None):
        tab.update_idletasks()

        pos_x, pos_y = tab.winfo_rootx(), tab.winfo_rooty()

        pos = tab.index(pos + " wordstart")
        bbox = tab.bbox(pos)
        if not bbox:
            return

        bbx_x, bbx_y, _, _ = bbox
        h = height if height else self.winfo_height()
        w = width if width else self.winfo_width()
        top_y = pos_y + bbx_y - h
        if top_y < 0:
            top_y = pos_y + bbx_y + 20

        if width and height:
            self.geometry(f"{w}x{h}+{pos_x + bbx_x - 1}+{top_y}")
        else:
            self.geometry(f"+{pos_x + bbx_x - 1}+{top_y}")

    def show(self, tab: Text, response: HoverResponse) -> None:
        if not response or not (response.text or response.docs):
            self.hide()
            return

        docs = ""
        try:
            if response.text[1].strip():
                docs += codeblock(response.text[1].strip(), tab.language_alias)
        except IndexError:
            pass

        if response.docs and response.docs.strip():
            docs += response.docs

        if not docs or not docs.strip():
            self.hide()
            return

        w, h = self.calculate_size(docs)
        self.renderer.render_markdown(docs)
        self.update_idletasks()
        self.deiconify()
        self.update_position(response.location, tab, width=w, height=h)

    def hide(self, *_) -> None:
        self.withdraw()
