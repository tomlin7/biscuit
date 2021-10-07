import os
import tkinter.ttk as ttk


class DirTree(ttk.Treeview):
    def __init__(self, master, startpath, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        
        self.configure(columns=("fullpath", "type"), displaycolumns='')
        
        self.create_root(startpath)
        self.bind("<<TreeviewOpen>>", self.update_tree)
        # self.bind("<<TreeviewSelect>>", update_tree)

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

            fname = os.path.split(p)[1]
            oid = self.insert(node, 'end', text=fname, values=[p, ptype])
            if ptype == 'directory':
                self.insert(oid, 0, text='dummy')

    def update_tree(self, event):
        self = event.widget
        self.fill_tree(self.focus())

    def create_root(self, startpath):
        dfpath = os.path.abspath(startpath)
        node = self.insert('', 'end', text=dfpath,
                values=[dfpath, "directory"], open=True)
        self.fill_tree(node)
