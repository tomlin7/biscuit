import tkinter as tk

import tarts as lsp

from biscuit.common.ui import Text
from biscuit.language.utils import decode_position

from .kinds import kinds


class Tree(Text):
    """Tree view that displays the outline of the active document."""

    def __init__(self, master):
        super().__init__(master, wrap="none", borderwidth=0, highlightthickness=0)
        self.master = master
        self.base = master.base
        self.config(
            cursor="hand2",
            **self.base.theme.views.sidebar.item.content,
            font=self.base.settings.uifont,
            padx=10,
            pady=10,
            spacing1=0,
            spacing2=0,
            spacing3=0,
        )

        for kind in kinds:
            if kind[1]:
                self.tag_config(kind[0], foreground=kind[1])
            self.tag_config(kind[0], font="codicon 12")
        self.tag_config(
            "branch", foreground=self.base.theme.border, font=("Segoi UI", 15)
        )

        # self.bind("<Button-1>", self.onclick)
        # self.bind("<Enter>", self.hoverin)
        # self.bind("<Leave>", self.hoverout)

    # def hoverin(self, _: tk.Event) -> None:
    #     self.tag_config("branch", foreground=self.base.theme.border)

    # def hoverout(self, _: tk.Event) -> None:
    #     self.tag_config("branch", foreground=self.base.theme.views.sidebar.item.content.background)

    def add_items(self, items: list[lsp.DocumentSymbol], level=0) -> None:
        if not items:
            return

        for item in items:
            if item.kind == lsp.SymbolKind.MODULE:
                continue

            tag = f"{item.name}{item.kind}"
            self.insert(tk.END, "┊" * level, "branch")
            self.insert(tk.END, kinds[item.kind - 1][0], kinds[item.kind - 1][0])
            self.insert(tk.END, f" {item.name}\n", tag)
            self.add_items(item.children, level + 1)
            self.tag_bind(
                tag,
                "<Button-1>",
                lambda e, i=item: self.base.goto_location_in_active_editor(
                    decode_position(i.range.start)
                ),
            )

    # def onclick(self, event: tk.Event) -> None:
    #     self.config(state=tk.NORMAL)
    #     index = self.index(f"@{event.x},{event.y}")
    #     self.tag_add(tk.SEL, f'{index} linestart', f'{index} lineend+1c')
    #     self.config(state=tk.DISABLED)
