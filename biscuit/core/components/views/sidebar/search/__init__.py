from tkinter.constants import *

from ....utils import ButtonsEntry, IconButton
from ..sidebarview import SidebarView


class Search(SidebarView):
    def __init__(self, master, *args, **kwargs):
        self.__buttons__ = (('refresh',), ('clear-all',), ('collapse-all',))
        self.__icon__ = 'search'
        super().__init__(master, *args, **kwargs)

        self.grid_columnconfigure(0, weight=1)

        self.searchbox = ButtonsEntry(self, buttons=(('case-sensitive',), ('whole-word',), ('regex',)))
        self.replacebox = ButtonsEntry(self, buttons=(('preserve-case',),))

        self.add_widget(self.searchbox)
        self.add_widget(self.replacebox, side=LEFT)
        self.add_widget(IconButton(self, 'replace-all'), side=RIGHT)
