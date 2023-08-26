from ..sidebarview import SidebarView
from .directorytree import DirectoryTree
from .menu import ExplorerMenu

from biscuit.core.components.floating.palette import ActionSet


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
    
        self.newfile_actionset = ActionSet(
            "Add new file to directory", "newfile:", pinned=[["Create new file: {}", lambda filename=None: self.directory.new_file(filename)]]
        )
        self.base.palette.register_actionset(lambda: self.newfile_actionset)
    
        self.newfolder_actionset = ActionSet(
            "Add new folder to parent directory", "newfolder:", pinned=[["Create new folder: {}", lambda foldername=None: self.directory.new_folder(foldername)]]
        )
        self.base.palette.register_actionset(lambda: self.newfolder_actionset)
    
    def get_actionset(self):
        return self.directory.get_actionset() 
