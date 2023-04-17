import os, asyncio
import tkinter as tk
from tkinter.constants import *

from ....utils import Tree
from ..item import SidebarViewItem
#TODO from .placeholder import DirectoryTreePlaceholder
from core.components import ActionSet


class DirectoryTree(SidebarViewItem):
    def __init__(self, master, startpath=None, *args, **kwargs):
        self.__buttons__ = (('new-file',), ('new-folder',), ('refresh',), ('collapse-all',))
        self.title = 'No folder opened'
        super().__init__(master, *args, **kwargs)

        self.actionset = ActionSet("Search files", "file:", [])

        # self.placeholder = DirectoryTreePlaceholder(self.content)
        # self.placeholder.grid(row=0, column=0, sticky=NSEW, padx=10, pady=5)
        
        self.tree = Tree(self.content, startpath, doubleclick=self.openfile, singleclick=self.preview_file, *args, **kwargs)
        self.tree.grid(row=0, column=0, sticky=NSEW)

        self.path = startpath
        if startpath:
            self.open_directory(startpath)
        else:
            self.tree.insert('', 0, text='You have not yet opened a folder.')

        self.tree.tree.bind("<<TreeviewOpen>>", self.update_tree)
    
    def create_root(self, path):
        self.tree.clear_tree()
        asyncio.run(self.update_treeview("", [(path, os.path.abspath(path))]))

    # def fill_node(self, node, path):
    #     self.tree.clear_node(node)

    #     items = [os.path.join(path, p) for p in os.listdir(path)]

    #     directories = sorted([p for p in items if os.path.isdir(p)])
    #     files = sorted([p for p in items if os.path.isfile(p)])

    #     for p in directories:
    #         name = os.path.split(p)[1]
    #         oid = self.tree.insert(node, tk.END, text=f"  {name}", values=[p, 'directory'], image='foldericon')
    #         if os.listdir(p):
    #             self.tree.insert(oid, 0, text='...')
    
    #     for p in files:
    #         if os.path.isfile(p):
    #             name = os.path.split(p)[1]
    #             oid = self.tree.insert(node, tk.END, text=f"  {name}", values=[p, 'file'], image='fileicon')

    def get_actionset(self):
        return self.actionset

    def get_all_files(self):
        files = []
        for item in self.tree.get_children():
            if self.tree.item_type(item) == 'file':
                files.append((self.tree.item(item, "text"), lambda _ : print(self.tree.item_fullpath(item))))
        
        return files
    
    def open_directory(self, path):
        self.path = os.path.abspath(path)
        self.create_root(self.path)
        self.itembar.set_title(os.path.basename(self.path))
    
    def refresh_tree(self):
        self.open_directory(self.path)
    
    async def async_scandir(self, path):
        entries = []
        for entry in os.scandir(path):
            entries.append((entry.name, entry.path))
        return entries

    async def update_treeview(self, parent, entries):
        files = []
        for name, path in entries:
            if os.path.isdir(path):
                item = self.tree.tree.insert(parent, "end", text=f"  {name}", values=[path, 'directory'], image='foldericon', open=False)
                await self.update_treeview(item, await self.async_scandir(path))
            else:
                self.tree.tree.insert(parent, "end", text=f"  {name}", values=[path, 'file'], image='fileicon')
                files.append((name, lambda _: print(path)))
        
        print(files)
        
        self.actionset = ActionSet("Search files by name", "file:", files)
    
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
    
    def openfile(self, _):
        if self.tree.selected_type() != 'file':
            return

        path = self.tree.selected_path()
        self.base.open_editor(path)

    # def update_panes(self):
    #     if self.base.active_dir is not None:
    #         self.enable_tree()
    #     else:
    #         self.disable_tree()
    
    def preview_file(self, _):
        #TODO preview editors -- extra preview param for editors
        return

    def update_node(self, node):
        if self.tree.item_type(node) != 'directory':
            return

        # path = self.tree.item_fullpath(node)
        self.tree.toggle_node(node)

    def update_tree(self, *_):
        self.update_node(self.tree.focus())
