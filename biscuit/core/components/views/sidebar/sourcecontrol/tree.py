import tkinter as tk

from .item import TreeItem
from ..item import SidebarViewItem


class Tree(SidebarViewItem):
    def __init__(self, master, title, *args, **kwargs):
        self.__buttons__ = (('discard',), ('add', self.git_add_all))
        self.title = title
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.views.sidebar.item)
        self.items = []

    def clear_tree(self, *_):
        for item in self.items:
            try:
                self.items.remove(item)
                item.destroy()
            except:
                pass
            
    def add_item(self, text, kind):
        new_item = TreeItem(self.content, text, kind)
        new_item.master = self
        new_item.pack(fill=tk.X)
        self.items.append(new_item)
    
    def git_add_all(self, *_):
        self.base.git.repo.add_files(*[item.path for item in self.items])
        self.master.open_repo()
