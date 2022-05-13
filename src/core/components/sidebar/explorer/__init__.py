import tkinter as tk

from ...views.directory import DirectoryTree
from ...views.directory import DirectoryTreeToolbar

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
