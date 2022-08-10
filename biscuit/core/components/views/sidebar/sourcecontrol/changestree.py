import threading
import tkinter as tk
from tkinter.constants import *

from ....utils import Tree
from ..item import SidebarViewItem


class ChangesTree(SidebarViewItem):
    def __init__(self, master, *args, **kwargs):
        self.__buttons__ = (('discard',), ('add',))
        self.title = 'Changes'
        super().__init__(master, *args, **kwargs)

        self.tree = Tree(self, *args, **kwargs)
        self.tree.grid(row=1, column=0, sticky=NSEW)

    # def openfile(self, event):
    #     item = self.focus()
    #     path = self.set(item, "fullpath")
    #     self.base.set_active_file(path, diff=True)

    # def add_files(self, parent, changed_files):
    #     for file in changed_files:
    #         oid = self.insert(parent, tk.END, text=f"  {file}", values=[file], image=self.file_icn)

    # def add_tree(self, basename, files=None):
    #     oid = self.insert('', tk.END, text=basename, open=True)
    #     if files:
    #         self.add_files(oid, files)
    
    # def open_repo(self, repo):
    #     changed_files = repo.get_changed_files()
    #     untracked_files = repo.get_untracked_files()
        
    #     self.clean_tree()
    #     self.add_tree("Changes", changed_files)
    #     self.add_tree("Untracked Files", untracked_files)
    
    # def open_repo_dir(self):
    #     threading.Thread(target=self.open_repo, args=[self.base.git.repo]).start()
