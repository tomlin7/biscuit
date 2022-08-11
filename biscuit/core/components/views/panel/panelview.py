from tkinter.constants import *

from ...utils import IconButton
from ..view import View


class PanelView(View):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.__buttons__ = ()

    def create_buttons(self, panelbar):
        self.__buttons__ = [IconButton(panelbar, *button, bg='white') for button in self.__buttons__]
