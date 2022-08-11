from tkinter.constants import *

from ....utils import Tree
from ..item import SidebarViewItem


class ChangesTree(SidebarViewItem):
    def __init__(self, master, *args, **kwargs):
        self.__buttons__ = (('discard',), ('add',))
        self.title = 'Changes'
        super().__init__(master, *args, **kwargs)

        self.tree = Tree(self.content, *args, **kwargs)
        self.tree.grid(row=0, column=0, sticky=NSEW)

    # def openfile(self, event):
    #     item = self.focus()
    #     path = self.set(item, "fullpath")
    #     self.base.set_active_file(path, diff=True)

    def add_files(self, parent='', changed_files=()):
        for file in changed_files:
            oid = self.insert(parent, END, text=f"  {file}", values=[file], image='fileicon')
    
    # def open_repo(self, repo):
    #     changed_files = repo.get_changed_files()
    #     untracked_files = repo.get_untracked_files()
        
    #     self.clean_tree()
    #     self.add_tree("Changes", changed_files)
    #     self.add_tree("Untracked Files", untracked_files)
