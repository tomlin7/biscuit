import tkinter as tk

from src.biscuit.common.ui import (Entry, Frame, IconLabelButton,
                                   ScrollableFrame)

from .changes import Changes
from .placeholder import ChangesTreePlaceholder
from .stagedchanges import StagedChanges


class Git(Frame):
    """The Git view.

    The Git view allows the user to manage the source control of the active document.
    - Show changes.
    - Show staged changes.
    - Commit changes.
    - Push changes.
    - Pull changes.
    """

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.views.sidebar.item)

        self.commitbox = Frame(self, **self.base.theme.views.sidebar.item)
        self.commit_message = Entry(
            self.commitbox, hint="Message", **self.base.theme.utils.entry
        )
        self.commit_message.pack(fill=tk.X, pady=(0, 5))

        self.commit_button = IconLabelButton(
            self.commitbox,
            text="Commit",
            icon="check",
            callback=self.commit,
            highlighted=True,
        )
        self.commit_button.pack(fill=tk.BOTH, side=tk.LEFT, expand=True)

        # Commit menu
        # tk.Label(self.commitbox, text="｜", **self.base.theme.utils.colorlabel).pack(side=tk.LEFT, fill=tk.Y)
        # self.more = IconButton(self.commitbox, icon='chevron-down')
        # self.more.config(**self.base.theme.utils.button)
        # self.more.pack(fill=tk.BOTH)

        self.container = ScrollableFrame(self, **self.base.theme.views.sidebar.item)
        self.container.canvas.config(**self.base.theme.views.sidebar.item)

        self.staged_changes_tree = StagedChanges(self, *args, **kwargs)
        self.container.add(self.staged_changes_tree, fill=tk.BOTH, expand=True)
        self.changes_tree = Changes(self, *args, **kwargs)
        self.container.add(self.changes_tree, fill=tk.BOTH, expand=True)

        self.placeholder = ChangesTreePlaceholder(self)
        self.placeholder.pack(fill=tk.BOTH, expand=True)

    def add_staged_changes(self, changed_files=(), kind=0) -> None:
        for file in changed_files:
            self.staged_changes_tree.add_item(file, kind)

        self.staged_changes_tree.refresh()

    def add_changes(self, changed_files=(), kind=0) -> None:
        for file in changed_files:
            self.changes_tree.add_item(file, kind)

        self.changes_tree.refresh()

    def open_repo(self) -> None:
        # self.staged_changes_tree.clear_tree()
        # self.changes_tree.clear_tree()
        # self.set_title(f"{os.path.basename(self.base.active_directory)}({self.base.git.active_branch})")

        if not self.base.git.repo:
            return

        staged = []

        if deleted := self.base.git.repo.get_staged_deleted_files():
            self.add_staged_changes(deleted, 0)
            staged += deleted
        if added := self.base.git.repo.get_staged_added_files():
            self.add_staged_changes(added, 1)
            staged += added
        if modified := self.base.git.repo.get_staged_modified_files():
            self.add_staged_changes(modified, 2)
            staged += modified

        if staged:
            self.staged_changes_tree.clear(otherthan=staged)

        unstaged = []

        if deleted := self.base.git.repo.get_deleted_files():
            self.add_changes(deleted, 0)
            unstaged += [(i, 0) for i in deleted]
        if added := self.base.git.repo.get_added_files():
            self.add_changes(added, 1)
            unstaged += [(i, 1) for i in added]
        if modified := self.base.git.repo.get_modified_files():
            self.add_changes(modified, 2)
            unstaged += [(i, 2) for i in modified]

        # untracked files
        if untracked := self.base.git.repo.get_untracked_files():
            self.add_changes(untracked, 3)
            unstaged += [(i, 3) for i in untracked]

        if unstaged:
            self.changes_tree.clear(otherthan=unstaged)

    def toggle_staged(self, *_) -> None:
        if not self.base.git_found:
            return

        if self.staged_changes_tree.winfo_ismapped():
            self.staged_changes_tree.pack_forget()
        else:
            self.staged_changes_tree.pack(
                fill=tk.BOTH, before=self.changes_tree, in_=self.container
            )

    def toggle_changes(self, *_) -> None:
        if not self.base.git_found:
            return

        if self.changes_tree.winfo_ismapped():
            self.changes_tree.pack_forget()
        else:
            self.changes_tree.pack(
                fill=tk.BOTH, after=self.staged_changes_tree, in_=self.container
            )

    def enable_tree(self) -> None:
        self.placeholder.pack_forget()
        self.commitbox.pack(padx=(15, 10), pady=5, fill=tk.BOTH)
        self.container.pack(fill=tk.BOTH, expand=True)

        self.staged_changes_tree.clear_tree()
        self.changes_tree.clear_tree()
        self.open_repo()

    def disable_tree(self) -> None:
        self.commitbox.pack_forget()
        self.container.pack_forget()
        self.placeholder.pack(fill=tk.BOTH, expand=True)

    def get_commit_message(self) -> str:
        return self.commit_message.get()

    def commit(self, *_) -> None:
        self.base.git.repo.commit_files(self.get_commit_message())

    def push(self, *_) -> None:
        self.base.git.repo.push_files()

    def pull(self, *_) -> None:
        self.base.git.repo.pull_files()
