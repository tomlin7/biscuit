import tkinter as tk

from ..sidebarview import SidebarView

# from ....placeholders.git import GitPlaceHolder


class SourceControl(SidebarView):
    def __init__(self, master, *args, **kwargs):
        self.__buttons__ = (('list-tree',), ('check',), ('refresh',), ('ellipsis',))
        self.__icon__ = 'source-control'
        super().__init__(master, *args, **kwargs)
