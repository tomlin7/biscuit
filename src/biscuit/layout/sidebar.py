from __future__ import annotations

import tkinter as tk
import typing

from biscuit.common.ui import Frame
from biscuit.views import *
from biscuit.common.ui.icon import Icons

if typing.TYPE_CHECKING:
    from biscuit.layout.statusbar.activitybar import ActivityBar


class SideBar(Frame):
    """Side bar of the application

    - Contains the SidebarViews
    - Manages the SidebarViews
    """

    def __init__(
        self, master: Frame, activitybar: ActivityBar, *args, **kwargs
    ) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.border)

        self.rowconfigure(1, weight=1)
        self.columnconfigure(0, weight=1)

        self.views = []
        self.active_view = None
        self.visible = False

        self.activitybar = activitybar
        self.activitybar.attach_sidebar(self)

        self.default_views = {
            "Explorer": Explorer(self),
            "Source Control": SourceControl(self),
            "Outline": Outline(self),
        }
        self.add_views(self.default_views.values())

        self.activitybar.add_separator()
        
        self.search_view = Search(self)
        self.add_view(self.search_view)
        
        self.activitybar.add_button(Icons.CHECK, "Problems", lambda: self.base.panel.show_problems())

    def toggle(self) -> None:
        """Toggle the sidebar."""

        if self.visible:
            self.hide()
        else:
            if not self.active_view:
                self.show_explorer()
            else:
                self.pack()

    def add_views(self, views: list[SideBarView]) -> None:
        """Adds multiple views to the sidebar at once."""

        for view in views:
            self.add_view(view)

    def add_view(self, view: SideBarView) -> None:
        """Adds a view to the sidebar.

        Args:
            view (SidebarView): The view to add."""

        self.views.append(view)
        self.activitybar.add_view(view)

    def create_view(self, name: str, icon: str = "browser") -> SideBarView:
        """Create a new view.

        Args:
            name (str): The name of the view.
            icon (str, optional): The icon of the view. Defaults to "browser"
        """

        view = SideBarView(self, name, icon)
        self.add_view(view)
        return view

    def delete_all_views(self) -> None:
        """Permanently delete all views."""

        for view in self.views:
            view.destroy()

        self.views.clear()

    def delete_view(self, view: SideBarView) -> None:
        """Permanently delete a view.

        Args:
            view (SidebarView): The view to delete."""

        view.destroy()
        self.views.remove(view)

    @property
    def explorer(self) -> Explorer:
        return self.default_views["Explorer"]

    @property
    def source_control(self) -> SourceControl:
        return self.default_views["Source Control"]

    @property
    def outline(self) -> Outline:
        return self.default_views["Outline"]

    @property
    def search(self) -> Search:
        return self.search_view

    def show_view(self, view: SideBarView) -> SideBarView:
        """Show a view in the sidebar.

        Args:
            view (SidebarView): The view to show."""

        for i in self.activitybar.buttons:
            if i.view == view:
                self.activitybar.set_active_slot(i)
                i.enable()
                self.active_view = view
                return view

    def show_explorer(self, *_) -> Explorer:
        return self.show_view(self.explorer)

    def show_source_control(self, *_) -> SourceControl:
        return self.show_view(self.source_control)

    def show_outline(self, *_) -> Outline:
        return self.show_view(self.outline)

    def show_search(self, *_) -> Search:
        return self.show_view(self.search)

    def pack(self, *args, **kwargs):
        if isinstance(self.master, tk.PanedWindow):
            self.master.add(self, before=self.base.contentpane, width=270, stretch="never")
            self.master.paneconfigure(self, minsize=50)
        else:
            super().pack(side=tk.LEFT, fill=tk.Y, before=self.base.contentpane, padx=(0, 1), *args, **kwargs)
        self.visible = True

    def hide(self):
        if isinstance(self.master, tk.PanedWindow):
            self.master.forget(self)
        else:
            super().pack_forget()
        self.visible = False
