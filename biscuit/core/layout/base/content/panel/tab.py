from __future__ import annotations

import typing

if typing.TYPE_CHECKING:
    from .tabs import Tabs
    from biscuit.core.components.views import PanelView

import tkinter as tk

from biscuit.core.components.utils import Menubutton


class Tab(Menubutton):
    """Single Tab component shown in panelbar

    Attributes
    ----------
    view
        the view that should be attached to the tab
    """
    def __init__(self, master: Tabs, view: PanelView, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.view = view
        self.selected = False

        self.config(text=view.__class__.__name__, padx=5, pady=5,
            font=("Segoe UI", 10), **self.base.theme.layout.base.content.panel.bar.tab)

        self.bind('<Button-1>', self.select)

    def deselect(self, *_) -> None:
        "deselects this tab and hides view attached to this tab"
        if self.selected:
            self.view.grid_remove()
            self.config(fg=self.base.theme.layout.base.content.panel.bar.tab.foreground)
            self.selected = False

    def select(self, *_) -> None:
        "selects this tab and shows attached to this tab"
        if not self.selected:
            self.master.set_active_tab(self)
            self.view.grid(column=0, row=1, sticky=tk.NSEW)
            self.config(fg=self.base.theme.layout.base.content.panel.bar.tab.selectedforeground)
            self.selected = True
