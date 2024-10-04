import os
import tkinter as tk

from biscuit.common import ActionSet
from biscuit.common.icons import Icons

from ..sidebar_view import SideBarView
from .directorytree import DirectoryTree
from .menu import ExplorerMenu
from .open_editors import OpenEditors


class Explorer(SideBarView):
    """A view that displays the file explorer.

    - The explorer view displays the directory tree and open editors.
    - context menu that allows the user to manage the files in the directory.
    - The user can search, manage files in the directory using palette
    """

    def __init__(self, master, *args, **kwargs) -> None:
        self.__actions__ = []
        super().__init__(master, *args, **kwargs)
        self.__icon__ = Icons.HOME
        self.name = "Explorer"

        self.menu = ExplorerMenu(self, "files")
        self.menu.add_checkable(
            "Open Editors", self.toggle_active_editors, checked=True
        )
        self.menu.add_separator(10)
        self.menu.add_command("Search", self.base.commands.search_files)
        self.add_action("ellipsis", self.menu.show)

        self.active_editors_visible = True
        self.open_editors = OpenEditors(self)
        self.open_editors.pack(fill=tk.X)
        self.directory = DirectoryTree(self, observe_changes=True)
        self.add_item(self.directory)

        self.filesearch_actionset = ActionSet("Search files", "file:", [])

        self.newfile_actionset = ActionSet(
            "Add new file to directory",
            "newfile:",
            pinned=[
                [
                    "Create new file: {}",
                    lambda filename=None: self.directory.new_file(filename),
                ]
            ],
        )
        self.base.palette.register_actionset(lambda: self.newfile_actionset)

        self.newfolder_actionset = ActionSet(
            "Add new folder to parent directory",
            "newfolder:",
            pinned=[
                [
                    "Create new folder: {}",
                    lambda foldername=None: self.directory.new_folder(foldername),
                ]
            ],
        )
        self.base.palette.register_actionset(lambda: self.newfolder_actionset)

        self.rename_actionset = ActionSet(
            "Rename a file/folder",
            "rename:",
            pinned=[
                [
                    "Rename to: {}",
                    lambda newname=None: self.directory.rename_item(newname),
                ]
            ],
        )
        self.base.palette.register_actionset(lambda: self.rename_actionset)

    def toggle_active_editors(self):
        if self.active_editors_visible:
            self.open_editors.pack_forget()
        else:
            self.open_editors.pack(fill=tk.X, before=self.directory)
        self.active_editors_visible = not self.active_editors_visible

    def get_actionset(self, term: str) -> ActionSet:
        self.filesearch_actionset.update(self.filesearch(term))
        return self.filesearch_actionset

    def filesearch(self, t):
        if not self.base.active_directory:
            return []

        pys = []
        for r, d, f in os.walk(self.base.active_directory):
            if any(i in r for i in self.directory.search_ignore_dirs):
                d[:] = []
                continue
            for file in f:
                if t in file:
                    pys.append(
                        (
                            file,
                            lambda _, path=os.path.join(r, file): self.base.open_editor(
                                path
                            ),
                        )
                    )
        return pys
