from __future__ import annotations

import tkinter as tk
import typing

from src.biscuit.common.ui import Menubutton

if typing.TYPE_CHECKING:
    from src.biscuit.views import PanelView

    from .panelbar import PanelBar


class Tab(Menubutton):
    """Tab of panel bar
    Panel views are attached to tabs. Tabs are displayed in the panel bar."""

    def __init__(self, master: PanelBar, view: PanelView, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.view = view
        self.selected = False

        self.config(
            text=view.__class__.__name__,
            padx=5,
            pady=5,
            font=("Segoe UI", 10),
            **self.base.theme.layout.content.panel.bar.tab,
        )

        self.bind("<Button-1>", self.select)

    def deselect(self, *_) -> None:
        if self.selected:
            self.view.grid_remove()
            self.config(fg=self.base.theme.layout.content.panel.bar.tab.foreground)
            self.selected = False

    def select(self, *_) -> None:
        if not self.selected:
            self.master.set_active_tab(self)
            self.view.grid(column=0, row=1, sticky=tk.NSEW)
            self.config(
                fg=self.base.theme.layout.content.panel.bar.tab.selectedforeground
            )
            self.selected = True
