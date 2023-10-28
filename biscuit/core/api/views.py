from biscuit.core.components.views import PanelView, SidebarView

from .endpoint import Endpoint


class Views(Endpoint):
    def __init__(self, *a) -> None:
        super().__init__(*a)        
        self.__sidebar = self._Endpoint__base.sidebar
        self.__panel = self._Endpoint__base.sidebar

        self.PanelView = PanelView
        self.SidebarView = SidebarView

    def add_sidebar_view(self, view):
        self.__sidebar.add_view(view)

    def add_panel_view(self, view):
        self.__panel.add_view(view)

    @property
    def explorer(self):
        return self.__sidebar.explorer

    @property
    def search(self):
        return self.__sidebar.search

    @property
    def source_control(self):
        return self.__sidebar.source_control

    @property
    def logger(self):
        return self.__panel.logger

    @property
    def terminal(self):
        return self.__panel.terminal

