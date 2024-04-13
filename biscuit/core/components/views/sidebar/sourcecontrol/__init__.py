import tkinter as tk

from ..sidebarview import SidebarView
from .git import Git
from .menu import SourceControlMenu


class SourceControl(SidebarView):
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.__icon__ = 'source-control'
        self.name = 'Source Control'

        self.tree = Git(self)
        self.add_widget(self.tree)
        self.bind('<Visibility>', self.reload_tree)

        self.menu = SourceControlMenu(self, 'files')
        self.menu.add_checkable("Show Staged", self.tree.toggle_staged, checked=True)
        self.menu.add_separator(10)
        self.menu.add_checkable("Show Changes", self.tree.toggle_changes, checked=True)
        self.add_button('refresh', self.refresh)
        self.add_button('ellipsis', self.menu.show)
    
    def reload_tree(self, *_) -> None:
        self.tree.open_repo()
    
    def refresh(self, *_) -> None:
        if self.base.git_found:
            self.tree.enable_tree()
            self.tree.open_repo()
        else:
            self.tree.disable_tree()
