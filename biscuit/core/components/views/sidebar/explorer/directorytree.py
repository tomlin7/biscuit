import os
import threading
from tkinter.constants import *

from biscuit.core.components.floating.palette.actionset import ActionSet
from biscuit.core.components.utils import Tree

from ..item import SidebarViewItem
from .placeholder import DirectoryTreePlaceholder
from .watcher import DirectoryTreeWatcher


class DirectoryTree(SidebarViewItem):
    def __init__(self, master, startpath=None, observe_changes=False, itembar=True, *args, **kwargs):
        self.__buttons__ = (('new-file', lambda: self.base.palette.show_prompt('newfile:')), ('new-folder', lambda: self.base.palette.show_prompt('newfolder:')), ('refresh',), ('collapse-all',))
        self.title = 'No folder opened'
        super().__init__(master, itembar, *args, **kwargs)

        self.nodes = {}
        
        self.actionset = ActionSet("Search files", "file:", [])
        self.ignore_dirs = [".git", "__pycache__", ".pytest_cache", "node_modules", "debug", "dist", "build"]
        self.ignore_exts = [".pyc"]

        self.tree = Tree(self.content, startpath, doubleclick=self.openfile, singleclick=self.preview_file, *args, **kwargs)
        self.tree.grid(row=0, column=0, sticky=NSEW)
        self.tree.grid_remove()
        self.tree.bind("<<Open>>", self.toggle_node)

        self.placeholder = DirectoryTreePlaceholder(self.content)
        self.placeholder.grid(row=0, column=0, sticky=NSEW)

        self.path = startpath
        self.watcher = DirectoryTreeWatcher(self, self.tree, observe_changes)
        self.loading = False

        if startpath:
            self.change_path(startpath)
        else:
            self.tree.insert('', 0, text='You have not yet opened a folder.')

    # IMPORTANT
    def change_path(self, path):
        self.nodes.clear()
        self.path = os.path.abspath(path)
        self.nodes[self.path] = ''
        if self.path:
            self.placeholder.grid_remove()
            self.tree.grid()
            self.tree.clear_tree()
            self.create_root(self.path)
            self.watcher.watch()
            
            self.set_title(os.path.basename(self.path))
        else:
            self.tree.grid_remove()
            self.placeholder.grid()
            self.set_title('No folder opened')
    
    def create_root(self, path, parent=''):
        if self.loading:
            return

        self.loading = True
        t = threading.Thread(target=self.run_create_root, args=(path, parent))
        t.daemon = True
        t.start()

    def run_create_root(self, path, parent=''):
        self.files = []
        
        self.update_treeview(path, parent)

        self.actionset = ActionSet("Search files by name", "file:", self.files)
        self.loading = False

    def get_actionset(self):
        return self.actionset

    def get_all_files(self):
        files = []
        for item in self.tree.get_children():
            if self.tree.item_type(item) == 'file':
                files.append((self.tree.item(item, "text"), lambda _, item=item: print(self.tree.item_fullpath(item))))
        
        return files
    
    def scandir(self, path):
        entries = []
        for entry in os.scandir(path):
            entries.append((entry.name, os.path.join(self.path, entry.path)))
        return entries
    
    def update_path(self, path):
        if any(path.endswith(i) for i in self.ignore_dirs):
            return

        node = self.nodes.get(os.path.abspath(path)) 
        for i in self.tree.get_children(node):
            self.tree.delete(i)
            
        self.create_root(path, node)

    def update_treeview(self, parent_path, parent=""):
        entries = self.scandir(parent_path)

        entries.sort(key=lambda x: (not os.path.isdir(x[1]), x[0]))
        for name, path in entries:
            if os.path.isdir(path):
                if name in self.ignore_dirs:
                    continue
                
                node = self.tree.insert(parent, "end", text=f"  {name}", values=[path, 'directory'], image='foldericon', open=False)
                self.nodes[os.path.abspath(path)] = node
                self.tree.insert(node, "end", text="loading...")

                # recursive mode loading (not good for large projects)
                #self.update_treeview(path, node)
            else:
                if name.split(".")[-1] in self.ignore_exts:
                    continue
                    
                #TODO check filetype and get matching icon, cases
                node = self.tree.insert(parent, "end", text=f"  {name}", values=[path, 'file'], image='document')
                self.nodes[os.path.abspath(path)] = node

                # for the actionset
                self.files.append((name, lambda _, path=path: self.base.open_editor(path)))
    
    def new_file(self, filename):
        if not filename:
            return

        parent = self.tree.selected_path() if self.tree.selected_type() != 'file' else self.tree.parent_selected()
        path = os.path.join(parent, filename)
        with open(path, 'w+') as f:
            f.write("")
        self.create_root(parent, self.nodes[parent])
    
    def new_folder(self, foldername):
        if not foldername:
            return

        parent = self.tree.selected_path() if self.tree.selected_type() != 'file' else self.tree.parent_selected()
        path = os.path.join(parent, foldername)
        try:
            os.makedirs(path, exist_ok=True)
        except:
            self.base.logger.error(f"Creating folder failed: no permission to write ('{path}')")
            self.base.notifications.error("Creating folder failed: see logs")
            return
        self.create_root(parent, self.nodes[parent])

    def close_directory(self):
        self.change_path(None)
    
    def toggle_node(self, _):
        node = self.tree.focus()
        for i in self.tree.get_children(node):
            self.tree.delete(i)
            
        self.create_root(self.tree.selected_path(), node)
    
    def openfile(self, _):
        if self.tree.selected_type() != 'file':
            return

        path = self.tree.selected_path()
        self.base.open_editor(path)

    def preview_file(self, _):
        #TODO preview editors -- extra preview param for editors
        return