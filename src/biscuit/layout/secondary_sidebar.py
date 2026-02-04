from __future__ import annotations

import tkinter as tk
import typing

from biscuit.common.ui import Frame
from biscuit.views import *
from biscuit.common.ui.icon import Icons

if typing.TYPE_CHECKING:
    from biscuit.layout.statusbar.activitybar import ActivityBar


class SecondarySideBar(Frame):
    """Secondary side bar of the application

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

        self.secondary_activitybar = activitybar
        self.secondary_activitybar.attach_sidebar(self)

        self.secondary_activitybar.add_button(Icons.TERMINAL, "Terminal", lambda: self.base.panel.show_terminal())

        self.default_views = {
            "Debug": Debug(self),
            "AI": AI(self),
            "Extensions": Extensions(self),
        }
        self.add_views(self.default_views.values())

    def toggle(self) -> None:
        """Toggle the sidebar."""

        if self.visible:
            self.hide()
        else:
            if not self.active_view:
                self.show_source_control()
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
        self.secondary_activitybar.add_view(view)

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
    def debug(self) -> Debug:
        return self.default_views["Debug"]

    @property
    def ai(self) -> AI:
        return self.default_views["AI"]

    @property
    def extensions(self) -> Extensions:
        return self.default_views["Extensions"]

    def show_view(self, view: SideBarView) -> SideBarView:
        """Show a view in the sidebar.

        Args:
            view (SidebarView): The view to show."""

        for i in self.secondary_activitybar.buttons:
            if i.view == view:
                self.secondary_activitybar.set_active_slot(i)
                i.enable()
                self.active_view = view
                return view

    def show_debug(self, *_) -> Debug:
        return self.show_view(self.debug)

    def show_ai(self, *_) -> AI:
        return self.show_view(self.ai)

    def show_extensions(self, *_) -> Extensions:
        return self.show_view(self.extensions)

    def pack(self, *args, **kwargs):
        if isinstance(self.master, tk.PanedWindow):
            # Already handled by add() being at the end of the PanedWindow list
            self.master.add(self, width=380, stretch="never")
            self.master.paneconfigure(self, minsize=50)
        else:
            super().pack(side=tk.LEFT, fill=tk.Y, after=self.base.contentpane, padx=(1, 0), *args, **kwargs)
        self.visible = True

    def hide(self):
        if isinstance(self.master, tk.PanedWindow):
            self.master.forget(self)
        else:
            super().pack_forget()
        self.visible = False
