from ..sidebarview import SidebarView
from .directorytree import DirectoryTree


class Explorer(SidebarView):
    def __init__(self, master, *args, **kwargs):
        self.__buttons__ = (('ellipsis',),)
        self.__icon__ = 'files'
        super().__init__(master, *args, **kwargs)

        self.view = DirectoryTree(self)
        self.add_widget(self.view)
