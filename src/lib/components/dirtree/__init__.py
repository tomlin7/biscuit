import os
import tkinter.ttk as ttk
import tkinter as tk

class DirTree(ttk.Treeview):
    def __init__(self, master, startpath, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        
        self.configure(columns=("fullpath", "type"), displaycolumns='')
        self.heading('#0', text="Explorer", anchor=tk.W)
        
        self.create_root(startpath)

        self.bind("<<TreeviewOpen>>", self.update_tree)
        # self.bind("<<TreeviewSelect>>", self.update_tree)
        self.bind('<Double-Button-1>', self.openfile)

    def openfile(self, event):
        self = event.widget
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
            oid = self.insert(node, 'end', text=fname, values=[p, ptype])
            if ptype == 'directory':
                self.insert(oid, 0, text='dummy')

    def update_tree(self, event):
        self = event.widget
        self.fill_tree(self.focus())

    def create_root(self, startpath):
        self.delete(*self.get_children())
        dfpath = os.path.abspath(startpath)
        basename = os.path.basename(dfpath)
        node = self.insert('', 'end', text=basename,
                values=[dfpath, "directory"], open=True)
        self.fill_tree(node)
