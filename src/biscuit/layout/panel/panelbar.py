from __future__ import annotations

import tkinter as tk
import typing

from src.biscuit.common.ui import Frame, IconButton

from .tab import Tab

if typing.TYPE_CHECKING:
    from src.biscuit.common.ui import IconButton
    from src.biscuit.layout.content import Content
    from src.biscuit.views.panelview import PanelView

    from .panel import Panel


class PanelBar(Frame):
    """Panelbar

    Contains the Tabs of panel views and control buttons of each view
    """

    def __init__(self, master: Panel, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        content: Content = master.master

        self.config(**self.base.theme.layout.content.panel.bar)

        self.tab_container = Frame(self, **self.base.theme.layout.content.panel.bar)
        self.tab_container.pack(fill=tk.X, side=tk.LEFT, expand=True)

        self.active_tabs: list[Tab] = []
        self.active_tab = None

        self.actions: list[IconButton] = []

        # These buttons are common for all panel views
        self.default_actions = (
            ("close", content.toggle_panel),
            ("chevron-up", content.toggle_max_panel, "chevron-down"),
        )

        for button in self.default_actions:
            IconButton(self, *button).pack(side=tk.RIGHT)

    def add_actions(self, buttons: list[IconButton]) -> None:
        """Add the buttons to the control buttons

        Args:
            buttons (list[IconButton]): buttons to be added"""

        for button in buttons:
            button.pack(side=tk.LEFT)
            self.actions.append(button)

    def replace_actions(self, buttons: list[IconButton]) -> None:
        """Replace the control buttons with the new buttons

        Args:
            buttons (list[IconButton]): new buttons"""

        self.clear()
        self.add_actions(buttons)

    def clear(self) -> None:
        for button in self.actions:
            button.pack_forget()
        self.actions.clear()

    def add_tab(self, view: PanelView) -> None:
        """Add the view to the tabs

        Args:
            view (PanelView): panel view to be added to the tabs"""

        tab = Tab(self, view)
        tab.pack(fill=tk.Y, side=tk.LEFT, in_=self.tab_container)
        self.active_tabs.append(tab)

        tab.select()

    def set_active_tab(self, selected_tab: Tab) -> None:
        """Set the selected tab as active tab

        Args:
            selected_tab (Tab): selected tab"""

        self.active_tab = selected_tab
        self.replace_actions(selected_tab.view.__actions__)
        for tab in self.active_tabs:
            if tab != selected_tab:
                tab.deselect()
