from __future__ import annotations

import tkinter as tk
import typing

from src.biscuit.utils import Toplevel

from .renderer import Renderer

if typing.TYPE_CHECKING:
    from src import App
    from src.biscuit.components.editors.texteditor.text import Text
    from src.biscuit.components.lsp.data import HoverResponse


class Hover(Toplevel):
    def __init__(self, master: App, bd: int=1, *args, **kw) -> None:
        super().__init__(master, *args, **kw)
        self.overrideredirect(True)
        self.maxsize(400, 200)
        self.config(bg=self.base.theme.border, bd=bd)

        self.label = tk.Label(self, padx=6, font=self.base.settings.font, 
                              anchor=tk.W, justify=tk.LEFT, **self.base.theme.editors.hover.text)
        self.label.pack(fill=tk.BOTH, expand=True)

        self.renderer = Renderer(self)
        self.renderer.pack(fill=tk.BOTH, expand=True)

        self.hovered = False
        self.withdraw()

        self.bind("<Enter>", lambda _: self.set_hovered(True))
        self.bind("<Leave>", lambda _: self.set_hovered(False))
        self.bind("<Escape>", self.hide)

    def set_hovered(self, flag: bool) -> None:
        self.hovered = flag

    def update_position(self, pos: str, tab: Text):
        tab.update_idletasks()
        
        pos_x, pos_y = tab.winfo_rootx(), tab.winfo_rooty()

        pos = tab.index(pos + " wordstart")
        bbox = tab.bbox(pos)
        if not bbox:
            return 

        bbx_x, bbx_y, _, _ = bbox
        self.geometry("+{}+{}".format(pos_x + bbx_x - 1, pos_y + bbx_y - self.winfo_height()))

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

    def hide_if_not_hovered(self) -> None:
        if not self.hovered:
            self.hide()
