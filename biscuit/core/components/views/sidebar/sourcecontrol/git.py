import tkinter as tk

from biscuit.core.utils import Button, Entry, Frame, IconButton
from biscuit.core.utils.iconlabelbutton import IconLabelButton

from .changes import Changes
from .placeholder import ChangesTreePlaceholder
from .stagedchanges import StagedChanges


class Git(Frame):
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.views.sidebar.item)

        self.commitbox = Frame(self, **self.base.theme.views.sidebar.item)
        self.commit_message = Entry(self.commitbox, hint="Message", **self.base.theme.utils.entry)
        self.commit_message.pack(fill=tk.X, pady=(0, 5))

        self.commit_button = IconLabelButton(self.commitbox, text='Commit', icon='git-commit', function=self.commit, highlighted=True)
        self.commit_button.pack(fill=tk.BOTH, side=tk.LEFT, expand=True)
        
        # Commit menu
        # tk.Label(self.commitbox, text="｜", **self.base.theme.utils.colorlabel).pack(side=tk.LEFT, fill=tk.Y)
        # self.more = IconButton(self.commitbox, icon='chevron-down')
        # self.more.config(**self.base.theme.utils.button)
        # self.more.pack(fill=tk.BOTH)

        self.staged_changes_tree = StagedChanges(self, *args, **kwargs)
        self.changes_tree = Changes(self, *args, **kwargs)

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
        self.staged_changes_tree.clear_tree()
        self.changes_tree.clear_tree()
        # self.set_title(f"{os.path.basename(self.base.active_directory)}({self.base.git.active_branch})")

        if not self.base.git.repo:
            return

        self.add_staged_changes(self.base.git.repo.get_staged_deleted_files(), 0)
        self.add_staged_changes(self.base.git.repo.get_staged_added_files(), 1)
        self.add_staged_changes(self.base.git.repo.get_staged_modified_files(), 2)

        self.add_changes(self.base.git.repo.get_deleted_files(), 0)
        self.add_changes(self.base.git.repo.get_added_files(), 1)
        self.add_changes(self.base.git.repo.get_modified_files(), 2)
        self.add_changes(self.base.git.repo.get_untracked_files(), 3)
    
    def toggle_staged(self, *_) -> None:
        if not self.base.git_found:
            return
        
        self.staged_changes_tree.pack_forget() if self.staged_changes_tree.winfo_ismapped() else self.staged_changes_tree.pack(fill=tk.BOTH, before=self.changes_tree)

    def toggle_changes(self, *_) -> None:
        if not self.base.git_found:
            return
        
        self.changes_tree.pack_forget() if self.changes_tree.winfo_ismapped() else self.changes_tree.pack(fill=tk.BOTH, after=self.staged_changes_tree)

    def enable_tree(self) -> None:
        self.placeholder.pack_forget()
        self.commitbox.pack(padx=(15, 10), pady=5, fill=tk.BOTH)
        self.staged_changes_tree.pack(fill=tk.BOTH)
        self.changes_tree.pack(fill=tk.BOTH)

        self.staged_changes_tree.clear_tree()
        self.changes_tree.clear_tree()
        self.open_repo()

    def disable_tree(self) -> None:
        self.commitbox.pack_forget()
        self.staged_changes_tree.pack_forget()
        self.changes_tree.pack_forget()
        self.placeholder.pack(fill=tk.BOTH, expand=True)

    def get_commit_message(self) -> str:
        return self.commit_message.get()

    def commit(self, *_) -> None:
        self.base.git.repo.commit_files(self.get_commit_message())
