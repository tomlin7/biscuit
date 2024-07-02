from __future__ import annotations

import tkinter as tk
import typing

from biscuit.common.ui import Frame
from biscuit.views import *

from .panelbar import PanelBar

if typing.TYPE_CHECKING:
    from ..content import Content


class Panel(Frame):
    """Panel
    Panel is a container for panel views. It contains a panelbar and a tabbed view of panel views.
    """

    def __init__(self, master: Content, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master: Content = master

        self.grid_rowconfigure(1, weight=1)
        self.grid_columnconfigure(0, weight=1)

        self.grid_propagate(False)
        self.config(height=300, **self.base.theme.layout.content.panel)

        self.panelbar = PanelBar(self)
        self.panelbar.grid(row=0, column=0, sticky=tk.EW)

        self.views: list[PanelView] = []

        self.default_views = [Problems(self), Logs(self), Control(self), Terminal(self)]
        self.add_views(self.default_views)

    def add_views(self, views: list[PanelView]) -> None:
        """Add multiple views to the panel."""

        for view in views:
            self.add_view(view)

    def add_view(self, view: PanelView) -> None:
        """Add a view to the panel.

        Args:
            view (PanelView): view to be added to the panel"""

        self.views.append(view)
        view.generate_actions(self.panelbar)

        self.panelbar.add_tab(view)

    def delete_all_views(self) -> None:
        """Permanently delete all views."""

        for view in self.views:
            view.destroy()

        self.views.clear()

    def delete_view(self, view: PanelView) -> None:
        """Permanently delete a view."""

        view.destroy()
        self.views.remove(view)

    def set_active_view(self, view: PanelView) -> None:
        for tab in self.panelbar.active_tabs:
            if tab.view == view:
                self.panelbar.set_active_tab(tab)
                tab.select()

    @property
    def problems(self) -> Problems:
        return self.default_views[0]

    @property
    def logger(self) -> Logs:
        return self.default_views[1]

    @property
    def control(self) -> Control:
        return self.default_views[2]

    @property
    def terminals(self) -> Terminal:
        return self.default_views[3]

    def show_terminal(self) -> None:
        """Shows the terminal if its hidden/minimized."""

        if not self.terminals.active_terminal:
            self.terminals.add_default_terminal()
        self.set_active_view(self.terminals)
        self.show_panel()

    def show_logs(self) -> None:
        """Shows the logs if its hidden/minimized."""

        self.set_active_view(self.logger)
        self.show_panel()

    def toggle_panel(self) -> None:
        """Toggles the panel visibility."""

        self.master.toggle_panel()

    def switch_to_terminal(self) -> None:
        if not self.terminals.active_terminal:
            self.terminals.add_default_terminal()
        self.set_active_view(self.terminals)

    def show_panel(self) -> None:
        """Calls toplevel method to show the panel."""

        self.master.show_panel()
