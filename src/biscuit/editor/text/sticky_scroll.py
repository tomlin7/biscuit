from __future__ import annotations
from dataclasses import dataclass
from typing import List, Optional

import tkinter as tk

from biscuit.common.ui import Frame

@dataclass
class StickyHeaderScope:
    line_number: int
    header_text: str

class StickyScrollController:
    def __init__(self):
        self.scopes: List[StickyHeaderScope] = []

    def set_scopes(self, scopes: List[StickyHeaderScope]):
        self.scopes = sorted(scopes, key=lambda s: s.line_number)

    def get_active_headers(self, current_top_line: int) -> List[str]:
        active = []
        for s in self.scopes:
            if s.line_number < current_top_line:
                active.append(s.header_text)
            else:
                break
        return active[-2:] # Show up to 2 enclosing scopes

    def get_active_scopes(self, current_top_line: int) -> List[StickyHeaderScope]:
        active = []
        for s in self.scopes:
            if s.line_number < current_top_line:
                active.append(s)
            else:
                break
        return active[-2:]

    def compute_scopes_from_text(self, text: str) -> List[StickyHeaderScope]:
        lines = text.split("\n")
        scopes = []
        for i, line in enumerate(lines):
            stripped = line.strip()
            if (
                stripped.startswith("class ")
                or stripped.startswith("def ")
                or stripped.startswith("async def ")
                or stripped.startswith("function ")
                or stripped.startswith("pub fn ")
                or stripped.startswith("fn ")
                or (stripped.endswith(":") and ("def " in stripped or "class " in stripped))
            ):
                scopes.append(StickyHeaderScope(line_number=i + 1, header_text=line.rstrip()))
        self.set_scopes(scopes)
        return scopes


class StickyScrollHeader(Frame):
    def __init__(self, master, text=None, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.text = text
        self.controller = StickyScrollController()
        self.labels: List[tk.Label] = []
        self.config(bg=self.base.theme.editors.background)
        self.visible = False

    def attach(self, text):
        self.text = text

    def update_scopes(self):
        if not self.text:
            return
        try:
            content = self.text.get("1.0", "end-1c")
            self.controller.compute_scopes_from_text(content)
        except Exception:
            pass

    def update_sticky_headers(self):
        if not self.text or getattr(self.master, "minimalist", False):
            self.hide()
            return

        try:
            top_line = int(self.text.index("@0,0").split(".")[0])
        except Exception:
            self.hide()
            return

        scopes = self.controller.get_active_scopes(top_line)
        if not scopes:
            self.hide()
            return

        for lbl in self.labels:
            lbl.destroy()
        self.labels.clear()

        bg = getattr(self.base.theme.editors, "currentline", None) or self.base.theme.border
        fg = getattr(getattr(self.base.theme.editors, "linenumbers", None), "number", None)
        fg_color = getattr(fg, "foreground", "#abb2bf") if fg else "#abb2bf"
        font = self.base.settings.font

        for s in scopes:
            lbl = tk.Label(
                self,
                text=f" {s.header_text}",
                bg=bg,
                fg=fg_color,
                font=font,
                anchor=tk.W,
                cursor="hand2",
                bd=0,
                padx=4,
                pady=1,
            )
            lbl.bind("<Button-1>", lambda _, line=s.line_number: self.text.goto_line(line))
            lbl.pack(fill=tk.X, expand=True)
            self.labels.append(lbl)

        self.show()

    def show(self):
        if not self.visible:
            self.visible = True
        self.place(in_=self.text, relx=0, rely=0, relwidth=1.0)
        self.lift()

    def hide(self):
        if self.visible:
            self.visible = False
            self.place_forget()
