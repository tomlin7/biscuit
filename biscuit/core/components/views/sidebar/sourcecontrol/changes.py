import tkinter as tk

from ..item import SidebarViewItem
from .item import ChangeItem


class Changes(SidebarViewItem):
    def __init__(self, master, *args, **kwargs):
        self.__buttons__ = (('discard',), ('add', self.git_add_all))
        self.title = "Changes"
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.views.sidebar.item)
        self.items = {}
    
    def refresh(self):
        if not self.items:
            self.itembar.hide_content()
        else:
            self.itembar.show_content()
        # self.update()

    def clear_tree(self, *_):
        for item, _ in self.items.values():
            try:
                item.pack_forget()
                item.destroy()
            except:
                pass
        
        self.items.clear()
            
    def add_item(self, path, kind):
        if path in self.items.keys():
            return

        new_item = ChangeItem(self.content, path, kind)
        new_item.master = self
        new_item.pack(fill=tk.X)
        self.items[path] = (new_item, kind)
    
    def git_add_all(self, *_):
        if unstaged := [(path, item[1]) for path, item in self.items.items()]:
            self.base.git.repo.stage_files(*unstaged)
            self.master.open_repo()
    
    def git_discard_all(self, *_):
        self.base.git.repo.discard_changes(self.path)
        self.master.master.open_repo()
