import tkinter as tk

from ..item import SidebarViewItem
from .stageditem import StagedChangeItem


class StagedChanges(SidebarViewItem):
    def __init__(self, master, *args, **kwargs) -> None:
        self.__buttons__ = (('remove', self.git_remove_all),)
        self.title = "Staged Changes"
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.views.sidebar.item)
        self.items = {}

    def refresh(self) -> None:
        if not self.items:
            self.itembar.hide_content()
        else:
            self.itembar.show_content()

    def clear_tree(self, *_) -> None:
        for item in self.items.values():
            try:
                item.destroy()
            except:
                pass

        self.items.clear()

    def add_item(self, path, kind) -> None:
        if path in self.items:
            return

        new_item = StagedChangeItem(self.content, path, kind)
        new_item.master = self
        new_item.pack(fill=tk.X)
        self.items[path] = new_item

    def git_remove_all(self, *_) -> None:
        if staged := list(self.items.keys()):
            self.base.git.repo.unstage_files(*staged)
            self.master.open_repo()
