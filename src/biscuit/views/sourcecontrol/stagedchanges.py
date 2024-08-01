import tkinter as tk

from ..sidebar_item import SideBarViewItem
from .stageditem import StagedChangeItem


class StagedChanges(SideBarViewItem):
    """The Staged Changes view.

    The Staged Changes view allows the user to view the staged changes made to the active document.
    - Remove staged changes.
    """

    def __init__(self, master, *args, **kwargs) -> None:
        self.__actions__ = (("remove", self.git_remove_all),)
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

    def clear(self, otherthan: list = []) -> None:
        if not otherthan:
            return self.clear_tree()

        for path in list(self.items.keys()):
            if path not in otherthan:
                self.items[path].destroy()
                del self.items[path]

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
            self.master.master.open_repo()
