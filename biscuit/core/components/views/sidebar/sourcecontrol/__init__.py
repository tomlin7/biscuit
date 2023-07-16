import tkinter as tk
from tkinter.constants import *

from ..sidebarview import SidebarView
from .changes import Changes

class SourceControl(SidebarView):
    def __init__(self, master, *args, **kwargs):
        self.__buttons__ = (('list-tree',), ('check',), ('refresh',), ('ellipsis',))
        super().__init__(master, *args, **kwargs)
        self.__icon__ = 'source-control'

        self.tree = Changes(self)
        self.add_widget(self.tree)
    
    def refresh(self):
        if self.base.git_found:
            self.tree.enable_tree()
            self.tree.open_repo()
        else:
            self.tree.disable_tree()