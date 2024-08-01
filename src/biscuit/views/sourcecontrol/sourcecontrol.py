import tkinter as tk

from ..sidebar_view import SideBarView
from .git import Git
from .menu import SourceControlMenu


class SourceControl(SideBarView):
    """The Source Control view.

    The Source Control view allows the user to manage the source control of the active document.
    Git is the only source control system supported.
    """

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.__icon__ = "source-control"
        self.name = "Source Control"

        self.git = Git(self)
        self.add_item(self.git)
        self.bind("<Visibility>", self.reload_tree)

        self.menu = SourceControlMenu(self, "files")
        self.menu.add_checkable("Show Staged", self.git.toggle_staged, checked=True)
        self.menu.add_separator(10)
        self.menu.add_checkable("Show Changes", self.git.toggle_changes, checked=True)
        self.add_action("refresh", self.refresh)
        self.add_action("repo-push", self.git.push)
        self.add_action("repo-pull", self.git.pull)
        self.add_action("ellipsis", self.menu.show)

    def reload_tree(self, *_) -> None:
        self.git.open_repo()

    def refresh(self, *_) -> None:
        if self.base.git_found:
            self.git.enable_tree()
            self.git.open_repo()
        else:
            self.git.disable_tree()
