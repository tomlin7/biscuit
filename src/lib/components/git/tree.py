import tkinter as tk
import tkinter.ttk as ttk
import os, threading

class GitTree(ttk.Treeview):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master
        
        self.configure(show="tree", columns=("fullpath"), displaycolumns='')
        self.bind('<Double-Button-1>', self.openfile)
    
    def openfile(self, event):
        item = self.focus()
        path = self.set(item, "fullpath")
        self.base.set_active_file(path, diff=True)

    def clean_tree(self):
        self.delete(*self.get_children())

    def add_files(self, parent, changed_files):
        for file in changed_files:
            oid = self.insert(parent, tk.END, text=file, values=[os.path.abspath(file)])

    def add_tree(self, basename, files=None):
        oid = self.insert('', tk.END, text=basename, open=True)
        if files:
            self.add_files(oid, files)
    
    def open_repo(self, repo):
        untracked_files = repo.untracked_files
        staged_files = [item.a_path for item in repo.index.diff(None)]
        
        self.clean_tree()
        self.add_tree("Staged Changes", staged_files)
        self.add_tree("Changes", untracked_files)

    def open_repo_dir(self):
        threading.Thread(target=self.open_repo, args=[self.master.core.repo]).start()
