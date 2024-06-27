from __future__ import annotations

import tkinter as tk
import typing

from biscuit.common.ui import Frame, Toplevel

from .renderer import HoverRenderer

if typing.TYPE_CHECKING:
    from biscuit.language.data import HoverResponse
    from src import App

    from ..text import Text


class Hover(Toplevel):
    def __init__(self, master: App, bd: int = 2, *args, **kw) -> None:
        super().__init__(master, *args, **kw)
        self.overrideredirect(True)
        self.maxsize(400, 200)
        self.config(bg=self.base.theme.primary_background_highlight, bd=bd)

        container = Frame(self, bg=self.base.theme.border)
        container.pack(fill=tk.BOTH, expand=True)

        self.label = tk.Label(
            container,
            padx=6,
            font=self.base.settings.font,
            anchor=tk.W,
            justify=tk.LEFT,
            **self.base.theme.editors.hover.text,
        )
        self.label.pack(fill=tk.BOTH, expand=True)

        self.renderer = HoverRenderer(container)
        self.renderer.pack(fill=tk.BOTH, expand=True)

        self.withdraw()

    def update_position(self, pos: str, tab: Text):
        tab.update_idletasks()

        pos_x, pos_y = tab.winfo_rootx(), tab.winfo_rooty()

        pos = tab.index(pos + " wordstart")
        bbox = tab.bbox(pos)
        if not bbox:
            return

        bbx_x, bbx_y, _, _ = bbox
        self.geometry(
            "+{}+{}".format(pos_x + bbx_x - 1, pos_y + bbx_y - self.winfo_height())
        )

    def show(self, tab: Text, response: HoverResponse) -> None:
        if response.text:
            if response.docs:
                self.renderer.pack_forget()
            self.label.config(text=response.text[1])
            self.label.pack(fill=tk.BOTH, expand=True)
        else:
            self.label.pack_forget()

        if response.docs:
            self.renderer.render_markdown(response.docs)
            self.renderer.pack(fill=tk.BOTH, pady=(1, 0) if response.text else 0)
        else:
            self.renderer.pack_forget()

        self.update()
        self.deiconify()
        try:
            self.update_position(response.location, tab)
        except:
            pass

    def hide(self, *_) -> None:
        self.withdraw()
