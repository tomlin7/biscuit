import os
import tkinter.ttk as ttk
import tkinter as tk

from .utils.binder import Binder

class DirTreeTree(ttk.Treeview):
    def __init__(self, master, startpath=None, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        
        self.configure(show="tree", columns=("fullpath", "type"), displaycolumns='')
        
        if startpath:
            self.create_root(startpath)
        else:
            self.insert('', 0, text='You have not yet opened a folder.')

        self.binder = Binder(self)

    def openfile(self, event):
        item = self.focus()
        if self.set(item, "type") != 'file':
            return
        path = self.set(item, "fullpath")

        self.base.set_active_file(path)
    
    def clear_node(self, node):
        self.delete(*self.get_children(node))

    def clear_tree(self, node):
        self.clear_node('')

    def fill_node(self, node, path):
        self.clear_node(node)

        a = 0
        items = [os.path.join(path, p) for p in os.listdir(path)]

        # sub directories
        directories = sorted([p for p in items if os.path.isdir(p)])
        files = sorted([p for p in items if os.path.isfile(p)])

        for p in directories:
            name = os.path.split(p)[1]
            oid = self.insert(node, tk.END, text=name, values=[p, 'directory'])
            self.insert(oid, 0, text='dummy')

            print(f"Folder-> {name}")
        
        for p in files:
            if os.path.isfile(p):
                name = os.path.split(p)[1]
                oid = self.insert(node, tk.END, text=name, values=[p, 'file'])

                print(f"File-> {name}")

    def update_node(self, node):
        if self.set(node, "type") != 'directory':
            return

        # parent = self.parent(node)
        path = self.set(node, "fullpath")
        self.fill_node(node, path)

    def update_tree(self, event):
        self = event.widget
        self.update_node(self.focus())

    def create_root(self, startpath):
        self.fill_node('', startpath)
