import tkinter as tk

from .directory import DirectoryTree
from .directory import DirectoryTreeToolbar

from ...sidebar import SideBar
from ...placeholders.dir import DirtreePlaceholder

class Explorer(SideBar):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.name = "Explorer"
        self.icon = "\ueaf0"
        self.tree_active = False

        self.config(bg="#f3f3f3")

        self.grid_rowconfigure(2, weight=1)
        self.grid_columnconfigure(0, weight=1)

        self.label_frame = tk.Frame(self)
        self.label_frame.config(bg="#f3f3f3")
        self.label_frame.grid(row=0, column=0, sticky=tk.EW)

        self.label = tk.Label(self.label_frame)
        self.label.config(
            text="EXPLORER", font=("Segoe UI", 8), anchor=tk.W, 
            bg="#f3f3f3", fg="#6f6f6f")
        self.label.grid(row=0, column=0, sticky=tk.EW, padx=20, pady=8)

        self.toolbar = DirectoryTreeToolbar(self)
        self.toolbar.grid(row=1, column=0, sticky=tk.EW)

        self.emptytree = DirtreePlaceholder(self)
        self.emptytree.grid(row=2, column=0, sticky=tk.NSEW, padx=20, pady=10)

        self.tree = DirectoryTree(self, double_click=self.openfile)
        self.update_panes()
    
    def open_directory(self, startpath):
        self.tree.open_directory(startpath)
        self.toolbar.update_dirname()

    def close_directory(self):
        self.tree.close_directory()
        self.toolbar.update_dirname()
    
    def disable_tree(self):
        if self.tree_active:
            self.tree.grid_remove()
            self.emptytree.grid()
            self.tree_active = False
    
    def enable_tree(self):
        if not self.tree_active:
            self.emptytree.grid_remove()
            self.tree.grid(row=2, column=0, sticky=tk.NSEW)
            self.tree_active = True
    
    def update_panes(self):
        if self.base.active_dir is not None:
            self.enable_tree()
        else:
            self.disable_tree()
    
    def openfile(self, event):
        item = self.tree.get_selected_item()
        if self.tree.get_item_type(item) != 'file':
            return

        path = self.tree.get_item_fullpath(item)

        # set active file
        self.base.set_active_file(path)
