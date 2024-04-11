"""
Panel holds the panel views and provides an interface to close/reopen them
+---------------------------------+
| Logs | Terminal |               |
+---------------------------------+
| \    \    \    \    \    \    \ |
|  \    \    \    \    \    \    \|
|   \    \    \    \    \    \    |
|    \    \    \    \    \    \   |
|\    \    \    \    \    \    \  |
+---------------------------------+
"""
from __future__ import annotations

import typing

if typing.TYPE_CHECKING:
    from .. import ContentPane

import tkinter as tk

from biscuit.core.components.views.panel import *
from biscuit.core.utils import Frame

from .panelbar import Panelbar


class Panel(Frame):
    """Tabbed container for views."""
    def __init__(self, master: ContentPane, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.grid_rowconfigure(1, weight=1)
        self.grid_columnconfigure(0, weight=1)

        self.grid_propagate(False)
        self.config(height=300, **self.base.theme.layout.base.content.panel)

        self.panelbar = Panelbar(self)
        self.panelbar.grid(row=0, column=0, sticky=tk.EW)
        self.tabs = self.panelbar.tabs

        self.views = []

        self.default_views = [Problems(self), Logs(self), Terminals(self)]
        self.add_views(self.default_views)

    def add_views(self, views: list[PanelView]) -> None:
        "Append views to list. Create tabs for them."
        for view in views:
            self.add_view(view)

    def add_view(self, view: PanelView) -> None:
        "Appends a view to list. Create a tab."
        self.views.append(view)
        view.create_buttons(self.panelbar)

        self.tabs.add_tab(view)

    def delete_all_views(self) -> None:
        "Permanently delete all views."
        for view in self.views:
            view.destroy()

        self.views.clear()

    def delete_view(self, view: PanelView) -> None:
        "Permanently delete a view."
        view.destroy()
        self.views.remove(view)

    def set_active_view(self, view: PanelView) -> None:
        "set an existing editor to currently shown one"
        for tab in self.tabs.tabs:
            if tab.view == view:
                self.tabs.set_active_tab(tab)
                tab.select()

    @property
    def problems(self) -> Problems:
        return self.default_views[0]
    
    @property
    def logger(self) -> Logs:
        return self.default_views[1]

    @property
    def terminals(self) -> Terminals:
        return self.default_views[2]

    def show_terminal(self) -> None:
        "shows the terminal if its hidden/minimized"
        if not self.terminals.active_terminal:
            self.terminals.add_default_terminal()
        self.set_active_view(self.terminals)
        self.show_panel()

    def show_logs(self) -> None:
        "shows the logs if its hidden/minimized"
        self.set_active_view(self.logger)
        self.show_panel()

    def toggle_panel(self) -> None:
        "toggles the current visible state of panel"
        self.master.toggle_panel()
    
    def switch_to_terminal(self) -> None:
        if not self.terminals.active_terminal:
            self.terminals.add_default_terminal()
        self.set_active_view(self.terminals)

    def show_panel(self) -> None:
        "shows the panel if its hidden/minimized"
        self.master.show_panel()
