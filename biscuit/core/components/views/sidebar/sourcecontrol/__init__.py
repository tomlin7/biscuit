from tkinter.constants import *

from ..sidebarview import SidebarView
from .changestree import ChangesTree


class SourceControl(SidebarView):
    def __init__(self, master, *args, **kwargs):
        self.__buttons__ = (('list-tree',), ('check',), ('refresh',), ('ellipsis',))
        self.__icon__ = 'source-control'
        super().__init__(master, *args, **kwargs)

        self.tree = ChangesTree(self)
        self.add_widget(self.tree)
