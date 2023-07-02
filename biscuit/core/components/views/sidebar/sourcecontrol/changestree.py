import os
import tkinter as tk
from hintedtext import HintedEntry

from .placeholder import ChangesTreePlaceholder
from ..item import SidebarViewItem

from core.components.utils import Tree, Frame, Button, IconButton


class ChangesTree(SidebarViewItem):
    def __init__(self, master, *args, **kwargs):
        self.__buttons__ = (('discard',), ('add',))
        self.title = 'No folder opened'
        super().__init__(master, *args, **kwargs)

        # --- COMMIT MESSAGE, BUTTON ---
        self.commitbox = Frame(self.content, **self.base.theme.views.sidebar.item)
        self.commitbox.grid(row=0, padx=(15, 10), pady=5, column=0, sticky=tk.NSEW)
        self.commitbox.grid_remove()

        self.commit_message_entry = HintedEntry(self.commitbox, hint="Message", relief=tk.FLAT, bd=5, **self.base.theme.utils.entry)
        self.commit_message_entry.pack(fill=tk.X, pady=(0, 5))

        self.commit_button = Button(self.commitbox, text='Commit')
        self.commit_button.pack(fill=tk.BOTH, side=tk.LEFT, expand=True)
        tk.Label(self.commitbox, text="｜", **self.base.theme.utils.colorlabel).pack(side=tk.LEFT, fill=tk.Y)
        self.more = IconButton(self.commitbox, icon='chevron-down')
        self.more.config(**self.base.theme.utils.button)
        self.more.pack(fill=tk.Y)
        # ------------------------------

        self.tree = Tree(self.content, doubleclick=self.opendiff, *args, **kwargs)
        self.tree.grid(row=1, column=0, sticky=tk.NSEW)
        self.tree.grid_remove()

        self.placeholder = ChangesTreePlaceholder(self.content)
        self.placeholder.grid(row=0, column=0, sticky=tk.NSEW)

    def opendiff(self, event):
        path = self.tree.selected_path()
        self.base.open_diff(path)

    def add_files(self, parent='', changed_files=()):
        for file in changed_files:
            self.tree.insert(parent, tk.END, text=f"  {file}", values=[file, 'file'], image='document')
    
    def open_repo(self):
        self.tree.clear_tree()
        self.set_title(f"{os.path.basename(self.base.active_directory)}({self.base.git.active_branch})")

        changes = self.tree.insert('', tk.END, text=f"  Changes", image='foldericon')
        untracked = self.tree.insert('', tk.END, text=f"  Untracked Files", image='foldericon')

        self.add_files(changes, self.base.git.repo.get_changed_files())
        self.add_files(untracked, self.base.git.repo.get_untracked_files())
    
    def enable_tree(self):
        self.content.grid_rowconfigure(0, weight=0)
        self.content.grid_rowconfigure(1, weight=1)
        self.placeholder.grid_remove()
        self.commitbox.grid()
        self.tree.grid()
        self.tree.clear_tree()
        self.open_repo()

    def disable_tree(self):
        self.content.grid_rowconfigure(0, weight=1)
        self.commitbox.grid_remove()
        self.tree.grid_remove()
        self.placeholder.grid()
        self.set_title('No folder opened')