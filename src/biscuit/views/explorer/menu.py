from __future__ import annotations

import typing

from biscuit.common import Menu

if typing.TYPE_CHECKING:
    from .directorytree import DirectoryTree


class ExplorerMenu(Menu):
    def get_coords(self, e) -> list:
        return e.widget.winfo_rootx(), e.widget.winfo_rooty() + e.widget.winfo_height()


class DirectoryContextMenu(Menu):
    def __init__(self, master: DirectoryTree, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master = master

        self.add_command("New file...", lambda: self.base.palette.show("newfile:"))
        self.add_command("New Folder...", lambda: self.base.palette.show("newfolder:"))
        self.add_command("Reveal in File Explorer", self.master.reveal_in_explorer)
        self.add_command("Open in Integrated Terminal", self.master.open_in_terminal)
        self.add_command("Reopen editor", self.master.reopen_editor)
        # self.add_separator()
        # self.add_command("Copy", self.master.new_file)
        # self.add_command("Cut", self.master.new_file)
        # self.add_command("Paste", self.master.new_file)
        self.add_separator()
        self.add_command("Copy Path", self.master.copy_path)
        self.add_command("Copy Relative Path", self.master.copy_relpath)
        self.add_command("Copy Name", self.master.copy_name)
        self.add_command(
            "Copy Name without Extension", self.master.copy_name_without_extension
        )
        self.add_separator()
        self.add_command("Attach to bikkis...", self.master.attach_to_chat)
        self.add_command("Add to .gitignore", self.master.add_to_gitignore)
        self.add_command("Exclude from .gitignore", self.master.exclude_from_gitignore)
        self.add_separator()
        self.add_command("Rename...", lambda: self.base.palette.show("rename:"))
        self.add_command("Delete", self.master.delete_item)

    def get_coords(self, e) -> list:
        return e.x_root, e.y_root

    def show(self, *e) -> None:
        super().show(*e)
