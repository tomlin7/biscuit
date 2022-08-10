import os
import tkinter as tk
from tkinter.constants import *

from ....utils import Tree
from ..item import SidebarViewItem


class DirectoryTree(SidebarViewItem):
    def __init__(self, master, startpath=None, double_click=lambda _: None, single_click=lambda _: None, *args, **kwargs):
        self.__buttons__ = (('new-file',), ('new-folder',), ('refresh',), ('collapse-all',))
        self.title = 'No folder opened'
        super().__init__(master, *args, **kwargs)
        
        self.tree = Tree(self, startpath, double_click, single_click, *args, **kwargs)
        self.tree.grid(row=1, column=0, sticky=NSEW)

        if startpath:
            self.open_directory(startpath)
        else:
            self.tree.insert('', 0, text='You have not yet opened a folder.')

        self.tree.tree.bind("<<TreeviewOpen>>", self.update_tree)
    
    def create_root(self, path):
        self.tree.clear_tree()
        self.fill_node('', path)

    def fill_node(self, node, path):
        self.tree.clear_node(node)

        items = [os.path.join(path, p) for p in os.listdir(path)]

        directories = sorted([p for p in items if os.path.isdir(p)])
        files = sorted([p for p in items if os.path.isfile(p)])

        for p in directories:
            name = os.path.split(p)[1]
            oid = self.tree.insert(node, tk.END, text=f"  {name}", values=[p, 'directory'], image=self.tree.folder_icn)
            if os.listdir(p):
                self.tree.insert(oid, 0, text='...')
    
        for p in files:
            if os.path.isfile(p):
                name = os.path.split(p)[1]
                oid = self.tree.insert(node, tk.END, text=f"  {name}", values=[p, 'file'], image=self.tree.file_icn)

    def open_directory(self, path):
        self.path = os.path.abspath(path)
        self.create_root(self.path)
        # threading.Thread(target=self.create_root, args=[self.path]).start()
        # self.toolbar.update_dirname()
    
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

    def close_directory(self):
        ...
        #self.toolbar.update_dirname()
    
    # def disable_tree(self):  
    #     if self.tree_active:
    #         self.grid_remove()
    #         self.emptytree.grid()
    #         self.tree_active = False
    
    # def enable_tree(self):
    #     if not self.tree_active:
    #         self.emptytree.grid_remove()
    #         self.grid(row=2, column=0, sticky=NSEW)
    #         self.tree_active = True
    
    # def openfile(self, event):
    #     item = self.get_selected_item()
    #     if self.get_item_type(item) != 'file':
    #         return

    #     path = self.get_item_fullpath(item)
    #     self.base.set_active_file(path)

    # def update_panes(self):
    #     if self.base.active_dir is not None:
    #         self.enable_tree()
    #     else:
    #         self.disable_tree()
    
    def update_node(self, node):
        if self.tree.set(node, "type") != 'directory':
            return

        path = self.tree.set(node, "fullpath")
        self.fill_node(node, path)

    def update_tree(self, *_):
        self.update_node(self.tree.focus())
