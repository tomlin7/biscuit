import tkinter as tk
import tkinter.ttk as ttk
import os


class GitTree(ttk.Treeview):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        
        self.configure(columns=("fullpath"), displaycolumns='')
        self.bind('<Double-Button-1>', self.openfile)

    def openfile(self, event):
        item = self.focus()
        path = self.set(item, "fullpath")

    def clean_tree(self):
        self.delete(*self.get_children())

    def add_files(self, parent, changed_files):
        for file in changed_files:
            oid = self.insert(parent, tk.END, text=file, values=[os.path.abspath(file)])

    def add_tree(self, basename, files=None):
        oid = self.insert('', tk.END, text=basename, open=True)
        if files:
            self.add_files(oid, files)
