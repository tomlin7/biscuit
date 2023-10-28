import tkinter as tk
from tkinter.constants import *

from ..sidebarview import SidebarView
from .git import Git
from .menu import SourceControlMenu


class SourceControl(SidebarView):
    def __init__(self, master, *args, **kwargs) -> None:
        self.__buttons__ = [('list-tree',), ('check',), ('refresh',)]
        super().__init__(master, *args, **kwargs)
        self.__icon__ = 'source-control'

        self.menu = SourceControlMenu(self, 'files')
        self.menu.add_item("Show Staged")
        self.menu.add_separator(10)
        self.menu.add_item("Show Changes")
        self.add_button('ellipsis', self.menu.show)

        self.tree = Git(self)
        self.add_widget(self.tree)
    
    def refresh(self) -> None:
        if self.base.git_found:
            self.tree.enable_tree()
            self.tree.open_repo()
        else:
            self.tree.disable_tree()
