from src.biscuit.components.views import PanelView, SidebarView

from .endpoint import Endpoint


class Views(Endpoint):
    def __init__(self, *a) -> None:
        super().__init__(*a)        
        self.sidebar = self.base.sidebar
        self.panel = self.base.sidebar

        self.PanelView = PanelView
        self.SidebarView = SidebarView

    def add_sidebar_view(self, view):
        self.sidebar.add_view(view)

    def add_panel_view(self, view):
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

