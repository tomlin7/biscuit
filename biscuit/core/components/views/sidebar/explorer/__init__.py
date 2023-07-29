from ..sidebarview import SidebarView
from .directorytree import DirectoryTree
from .menu import ExplorerMenu


class Explorer(SidebarView):
    def __init__(self, master, *args, **kwargs):
        self.__buttons__ = []
        super().__init__(master, *args, **kwargs)
        self.__icon__ = 'files'

        self.menu = ExplorerMenu(self, 'files')
        self.menu.add_item("Open Editors")
        self.menu.add_separator(10)
        self.menu.add_item("Folders")
        self.add_button('ellipsis', self.menu.show)

        self.directory = DirectoryTree(self)
        self.add_widget(self.directory)
    
    def get_actionset(self):
        return self.directory.get_actionset() 
