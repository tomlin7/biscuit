from __future__ import annotations

import tkinter as tk
import typing

from src.biscuit.common.ui import Frame
from src.biscuit.views import *

from .activitybar import ActivityBar

if typing.TYPE_CHECKING:
    ...


class NavigationDrawer(Frame):
    """Navigation drawer of the application

    - Contains the SidebarViews
    - Manages the SidebarViews
    """

    def __init__(self, master: Frame, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.border)

        self.rowconfigure(0, weight=1)
        self.columnconfigure(1, weight=1)

        self.activitybar = ActivityBar(self)
        self.activitybar.grid(sticky=tk.NS, column=0, row=0, padx=(0, 1))

        self.views = []

        self.default_views = {
            "Explorer": Explorer(self),
            "Outline": Outline(self),
            "Search": Search(self),
            "Source Control": SourceControl(self),
            "Debug": Debug(self),
            "AI": AI(self),
            "GitHub": GitHub(self),
            "Extensions": Extensions(self),
        }
        self.add_views(self.default_views.values())
        self.activitybar.toggle_first_slot()

    def add_views(self, views: list[NavigationDrawerView]) -> None:
        """Adds multiple views to the drawer at once."""

        for view in views:
            self.add_view(view)

    def add_view(self, view: NavigationDrawerView) -> None:
        """Adds a view to the drawer.

        Args:
            view (SidebarView): The view to add."""

        self.views.append(view)
        self.activitybar.add_view(view)

    def create_view(self, name: str, icon: str = "browser") -> NavigationDrawerView:
        """Create a new view.

        Args:
            name (str): The name of the view.
            icon (str, optional): The icon of the view. Defaults to "browser"
        """

        view = NavigationDrawerView(self, name, icon)
        self.add_view(view)
        return view

    def delete_all_views(self) -> None:
        """Permanently delete all views."""

        for view in self.views:
            view.destroy()

        self.views.clear()

    def delete_view(self, view: NavigationDrawerView) -> None:
        """Permanently delete a view.

        Args:
            view (SidebarView): The view to delete."""

        view.destroy()
        self.views.remove(view)

    @property
    def explorer(self) -> Explorer:
        return self.default_views["Explorer"]

    @property
    def outline(self) -> Outline:
        return self.default_views["Outline"]

    @property
    def search(self) -> Search:
        return self.default_views["Search"]

    @property
    def source_control(self) -> SourceControl:
        return self.default_views["Source Control"]

    @property
    def debug(self) -> Debug:
        return self.default_views["Debug"]

    @property
    def ai(self) -> AI:
        return self.default_views["AI"]

    @property
    def github(self) -> GitHub:
        return self.default_views["GitHub"]

    @property
    def extensions(self) -> Extensions:
        return self.default_views["Extensions"]

    def show_view(self, view: NavigationDrawerView) -> None:
        """Show a view in the drawer.

        Args:
            view (SidebarView): The view to show."""

        for i in self.activitybar.buttons:
            if i.view == view:
                self.activitybar.set_active_slot(i)
                i.enable()
                break

    def show_explorer(self) -> None:
        self.show_view(self.explorer)

    def show_outline(self) -> None:
        self.show_view(self.outline)

    def show_search(self) -> None:
        self.show_view(self.search)

    def show_source_control(self) -> None:
        self.show_view(self.source_control)

    def show_debug(self) -> None:
        self.show_view(self.debug)

    def show_ai(self) -> None:
        self.show_view(self.ai)

    def show_github(self) -> None:
        self.show_view(self.github)

    def show_extensions(self) -> None:
        self.show_view(self.extensions)

    def pack(self):
        super().pack(side=tk.LEFT, fill=tk.Y)
