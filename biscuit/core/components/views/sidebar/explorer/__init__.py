from ..sidebarview import SidebarView
from .directorytree import DirectoryTree


class Explorer(SidebarView):
    def __init__(self, master, *args, **kwargs):
        self.__buttons__ = (('ellipsis',),)
        super().__init__(master, *args, **kwargs)
        self.__icon__ = 'files'

        self.directory = DirectoryTree(self)
        self.add_widget(self.directory)
    
    def get_actionset(self):
        return self.directory.get_actionset() 
