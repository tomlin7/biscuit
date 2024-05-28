from __future__ import annotations

import typing

if typing.TYPE_CHECKING:
    from . import Panelbar
    from src.biscuit.components.views import PanelView

import tkinter as tk

from src.biscuit.utils import Frame

from .tab import Tab


class Tabs(Frame):
    """Holder for the tabs shown in panelbar"""
    def __init__(self, master: Panelbar, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.layout.base.content.panel.bar)

        self.tabs = []
        self.active_tab = None

    def add_tab(self, view: PanelView) -> None:
        "adds a tab for the passed View"
        tab = Tab(self, view)
        tab.pack(fill=tk.Y, side=tk.LEFT)
        self.tabs.append(tab)

        tab.select()

    def set_active_tab(self, selected_tab: Tab) -> None:
        "sets currently visible tab to the passed the tab"
        self.active_tab = selected_tab
        self.master.replace_buttons(selected_tab.view.__buttons__)
        for tab in self.tabs:
            if tab != selected_tab:
                tab.deselect()
