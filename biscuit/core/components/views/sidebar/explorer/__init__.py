import tkinter as tk
from tkinter.constants import *

from ..sidebarview import SidebarView
from .directorytree import DirectoryTree
from ....utils.scrollbar import Scrollbar

# from .toolbar import DirectoryTreeToolbar


class Explorer(SidebarView):
    def __init__(self, master, double_click=None, *args, **kwargs):
        self.__buttons__ = (('ellipsis',),)
        super().__init__(master, *args, **kwargs)

        self.view = DirectoryTree(self, double_click=double_click)
        self.add_widget(self.view)
