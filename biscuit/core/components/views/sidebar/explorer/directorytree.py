import os, threading
import tkinter as tk
from tkinter.constants import *

from ..item import ViewItem
from ....utils import Tree


class DirectoryTree(ViewItem):
    def __init__(self, master, double_click=None, single_click=None, startpath=None, *args, **kwargs):
        self.__buttons__ = (('new-file',), ('new-folder',), ('refresh',))
        self.title = 'No folder opened'
        super().__init__(master, *args, **kwargs)
        
        # self.tree = Tree(self, double_click, single_click, startpath, *args, **kwargs)
        # self.tree.grid(row=0, column=0, sticky=NSEW)

        # if startpath:
        #     self.open_directory(startpath)
        # else:
        #     self.insert('', 0, text='You have not yet opened a folder.')

        # self.bind("<<TreeviewOpen>>", self.update_tree)

    def toggle_node(self, node):
        if self.item_type(node) == 'directory':
            if self.is_open(node):
                self.item(node, open=False)
            else:
                self.item(node, open=True)
            self.update_node(node)
    
    def fill_node(self, node, path):
        self.clear_node(node)

        items = [os.path.join(path, p) for p in os.listdir(path)]

        directories = sorted([p for p in items if os.path.isdir(p)])
        files = sorted([p for p in items if os.path.isfile(p)])

        for p in directories:
            name = os.path.split(p)[1]
            oid = self.insert(node, tk.END, text=f"  {name}", values=[p, 'directory'], image=self.folder_icn)
            self.insert(oid, 0, text='dummy')
    
        for p in files:
            if os.path.isfile(p):
                name = os.path.split(p)[1]
                oid = self.insert(node, tk.END, text=f"  {name}", values=[p, 'file'], image=self.file_icn)

    def update_node(self, node):
        if self.set(node, "type") != 'directory':
            return

        path = self.set(node, "fullpath")
        self.fill_node(node, path)

    def update_tree(self, *_):
        self.update_node(self.focus())

    def create_root(self, path):
        self.clear_tree()
        self.fill_node('', path)
    
    def open_directory(self, path):
        self.path = os.path.abspath(path)
        threading.Thread(target=self.create_root, args=[self.path]).start()
    
    def refresh_tree(self):
        self.open_directory(self.path)
    
    # def add_node(self):
    #     name = enterbox("Enter file name")
    #     selected = self.focus() or ''
    #     # parent = self.parent(selected)
    #     # if parent == '':
    #     #     parent = self.path
    #     path = os.path.join(self.item_fullpath(selected), name)
    #     # fullpath = os.path.join(parent_path, name)
    #     with open(path, 'w') as f:
    #         f.write("")
    #     self.update_node(selected)

    def open_directory(self, startpath):
        self.open_directory(startpath)
        self.toolbar.update_dirname()

    def close_directory(self):
        self.close_directory()
        self.toolbar.update_dirname()
    
    def disable_tree(self):  
        if self.tree_active:
            self.grid_remove()
            self.emptytree.grid()
            self.tree_active = False
    
    def enable_tree(self):
        if not self.tree_active:
            self.emptytree.grid_remove()
            self.grid(row=2, column=0, sticky=NSEW)
            self.tree_active = True
    
    def update_panes(self):
        if self.base.active_dir is not None:
            self.enable_tree()
        else:
            self.disable_tree()
    
    def openfile(self, event):
        item = self.get_selected_item()
        if self.get_item_type(item) != 'file':
            return

        path = self.get_item_fullpath(item)

        # set active file
        self.base.set_active_file(path)

