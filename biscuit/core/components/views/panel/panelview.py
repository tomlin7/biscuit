from tkinter.constants import *

from ...utils import IconButton
from ..view import View


class PanelView(View):
    """Base class of Panel Views"""

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.views.panel)

        self.__buttons__ = []

    def add_button(self, icon, event=lambda *_: ...) -> None:
        self.__buttons__.append((icon, event))

    def create_buttons(self, panelbar) -> None:
        self.__buttons__ = [IconButton(panelbar, *button) for button in self.__buttons__]

