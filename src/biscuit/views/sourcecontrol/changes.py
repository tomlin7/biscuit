import tkinter as tk

from biscuit.common.icons import Icons

from ..sidebar_item import SideBarViewItem
from .item import ChangeItem


class Changes(SideBarViewItem):
    """The Changes view.

    The Changes view allows the user to view the changes made to the active document.
    - Discard changes.
    - Add changes.
    """

    def __init__(self, master, *args, **kwargs) -> None:
        self.__actions__ = (
            (Icons.DISCARD, self.git_discard_all),
            (Icons.ADD, self.git_add_all),
        )
        self.title = "Changes"
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.views.sidebar.item)
        self.items = {}

    def refresh(self) -> None:
        if not self.items:
            self.itembar.hide_content()
        else:
            self.itembar.show_content()
        # self.update()

    def clear_tree(self, *_) -> None:
        for item, _ in self.items.values():
            try:
                item.pack_forget()
                item.destroy()
            except:
                pass

        self.items.clear()

    def clear(self, otherthan: list = []) -> None:
        if not otherthan:
            return self.clear_tree()

        for path, val in list(self.items.items()):
            if (path, val[1]) not in otherthan:
                self.items[path][0].destroy()
                del self.items[path]

    def add_item(self, path, kind) -> None:
        if path in self.items and self.items[path][1] == kind:
            return

        new_item = ChangeItem(self, path, kind)
        new_item.pack(fill=tk.X, in_=self.content)
        self.items[path] = (new_item, kind)

    def git_add_all(self, *_) -> None:
        if unstaged := [(path, item[1]) for path, item in self.items.items()]:
            self.base.git.repo.stage_files(*unstaged)
            self.master.open_repo()

    def git_discard_all(self, *_) -> None:
        self.base.git.repo.discard_changes(self.path)
        self.master.master.open_repo()
