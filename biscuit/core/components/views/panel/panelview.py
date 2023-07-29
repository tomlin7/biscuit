from tkinter.constants import *

from ...utils import IconButton
from ..view import View


class PanelView(View):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.views.panel)

        self.__buttons__ = []
    
    def add_button(self, icon, event=lambda *_: ...):
        self.__buttons__.append((icon, event))
        
    def create_buttons(self, panelbar):
        self.__buttons__ = [IconButton(panelbar, *button) for button in self.__buttons__]
