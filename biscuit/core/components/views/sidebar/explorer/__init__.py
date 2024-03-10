import os

from biscuit.core.components.floating.palette import ActionSet

from ..sidebarview import SidebarView
from .directorytree import DirectoryTree
from .menu import ExplorerMenu


class Explorer(SidebarView):
    def __init__(self, master, *args, **kwargs) -> None:
        self.__buttons__ = []
        super().__init__(master, *args, **kwargs)
        self.__icon__ = 'files'
        self.name = 'Explorer'

        self.menu = ExplorerMenu(self, 'files')
        self.menu.add_item("Open Editors", self.base.events.show_active_editors)
        self.menu.add_separator(10)
        self.menu.add_item("Search", self.base.events.show_file_search_palette)
        self.add_button('ellipsis', self.menu.show)

        self.directory = DirectoryTree(self, observe_changes=True)
        self.add_widget(self.directory)

        self.filesearch_actionset = ActionSet("Search files", "file:", [])

        self.newfile_actionset = ActionSet(
            "Add new file to directory", "newfile:", pinned=[["Create new file: {}", lambda filename=None: self.directory.new_file(filename)]]
        )
        self.base.palette.register_actionset(lambda: self.newfile_actionset)

        self.newfolder_actionset = ActionSet(
            "Add new folder to parent directory", "newfolder:", pinned=[["Create new folder: {}", lambda foldername=None: self.directory.new_folder(foldername)]]
        )
        self.base.palette.register_actionset(lambda: self.newfolder_actionset)

        self.rename_actionset = ActionSet(
            "Rename a file/folder", "rename:", pinned=[["Rename: {}", lambda newname=None: self.directory.rename_item(newname)]]
        )
        self.base.palette.register_actionset(lambda: self.rename_actionset)

    def get_actionset(self, term: str) -> ActionSet:
        self.filesearch_actionset.update(self.filesearch(term))
        return self.filesearch_actionset 
    
    def filesearch(self, t):
        if not self.base.active_directory:
            return []
        
        pys = []
        for r, d, f in os.walk(self.base.active_directory):
            if any(i in r for i in self.directory.ignore_dirs):
                d[:] = []
                continue
            for file in f:
                if t in file:
                    pys.append((file, lambda _, path=os.path.join(r, file): self.base.open_editor(path)))
        return pys
