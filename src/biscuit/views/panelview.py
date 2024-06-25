from biscuit.common.ui import IconButton

from .view import View


class PanelView(View):
    """Abstract class for creating a panel view."""

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.views.panel)

        self.__actions__ = []

    def add_action(self, icon, event=lambda *_: ...) -> None:
        self.__actions__.append((icon, event))

    def generate_actions(self, panelbar) -> None:
        self.__actions__ = [
            IconButton(panelbar, *action) for action in self.__actions__
        ]
