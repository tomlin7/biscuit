import tkinter as tk

from src.biscuit.utils import Frame, IconButton


class BaseGame(Frame):
    """Base class for games."""
    def __init__(self, master, path=None, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.editors)
        self.path = path
        self.filename = None

        self.exists = False
        self.showpath = False
        self.diff = False
        self.editable = False        

        self.__buttons__ = (('refresh', self.reload), )

    def add_buttons(self, icon, event) -> None:
        self.__buttons__.append((icon, event))

    def create_buttons(self, editorbar) -> None:
        self.__buttons__ = [IconButton(editorbar, *button) for button in self.__buttons__]

    def reload(self, *_) -> None:
        ...    

    def save(self, *_) -> None:
        ...
