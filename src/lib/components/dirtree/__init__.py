import os
import tkinter.ttk as ttk
import tkinter as tk

from .utils.binder import Binder

class DirTree(ttk.Treeview):
    def __init__(self, master, startpath=None, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        
        self.configure(columns=("fullpath", "type"), displaycolumns='')
        
        if startpath:
            self.create_root(startpath)
        else:
            self.set_heading('No Folder Opened')
            self.insert('', 0, text='You have not yet opened a folder.')

        self.binder = Binder(self)
    
    def set_heading(self, text):
        self.heading('#0', text=text, anchor=tk.W)

    def openfile(self, event):
        item = self.focus()
        if self.set(item, "type") != 'file':
            return
        path = self.set(item, "fullpath")

        self.base.set_active_file(path)

    def fill_tree(self, node):
        if self.set(node, "type") != 'directory':
            return

        path = self.set(node, "fullpath")

        # Delete the possibly 'dummy' node present.
        self.delete(*self.get_children(node))

        parent = self.parent(node)
        for p in os.listdir(path):
            p = os.path.join(path, p)
            ptype = None
            if os.path.isdir(p):
                ptype = 'directory'
            elif os.path.isfile(p):
                ptype = 'file'

            fname = os.path.split(p)[1]
            oid = self.insert(node, tk.END, text=fname, values=[p, ptype])
            if ptype == 'directory':
                self.insert(oid, 0, text='dummy')

    def update_tree(self, event):
        self = event.widget
        self.fill_tree(self.focus())

    def create_root(self, startpath):
        self.delete(*self.get_children())

        dfpath = os.path.abspath(startpath)
        basename = os.path.basename(dfpath)

        self.set_heading(basename)

        for p in os.listdir(dfpath):
            p = os.path.join(dfpath, p)
            ptype = None
            if os.path.isdir(p):
                ptype = 'directory'
            elif os.path.isfile(p):
                ptype = 'file'

            fname = os.path.split(p)[1]
            oid = self.insert('', tk.END, text=fname, values=[p, ptype])
            if ptype == 'directory':
                self.insert(oid, 0, text='dummy')
