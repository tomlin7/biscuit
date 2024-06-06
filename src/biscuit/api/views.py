from __future__ import annotations

import typing

from .endpoint import Endpoint

if typing.TYPE_CHECKING:
    from src.biscuit.views import NavigationDrawerView, PanelView


class Views(Endpoint):
    """Views endpoint

    Side bar and panel views are managed by this endpoint.
    Further, new views can be added to the side bar and panel.

    Abstract `PanelView` and `SidebarView` are provided to create new views.
    """

    def __init__(self, *a) -> None:
        super().__init__(*a)
        self.sidebar = self.base.drawer
        self.panel = self.base.drawer

        from src.biscuit.views import NavigationDrawerView, PanelView

        self.PanelView = PanelView
        self.SidebarView = NavigationDrawerView

    def add_sidebar_view(self, view: PanelView):
        self.sidebar.add_view(view)

    def add_panel_view(self, view: NavigationDrawerView):
        self.panel.add_view(view)

    @property
    def explorer(self):
        return self.sidebar.explorer

    @property
    def search(self):
        return self.sidebar.search

    @property
    def source_control(self):
        return self.sidebar.source_control

    @property
    def logger(self):
        return self.panel.logger

    @property
    def terminal(self):
        return self.panel.terminal
