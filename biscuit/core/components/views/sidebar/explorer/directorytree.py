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

        self.placeholder = DirectoryTreePlaceholder(self.content)
        self.placeholder.grid(row=0, column=0, sticky=NSEW)

        self.path = startpath
        self.watcher = DirectoryTreeWatcher(self, self.tree, observe_changes)
        if startpath:
            self.change_path(startpath)
        else:
            self.tree.insert('', 0, text='You have not yet opened a folder.')

    # IMPORTANT
    def change_path(self, path):
        self.nodes.clear()
        self.path = path
        if self.path:
            self.placeholder.grid_remove()
            self.tree.grid()
            self.watcher.watch()
            self.tree.clear_tree()
            self.create_root()
            
            self.set_title(os.path.basename(self.path))
        else:
            self.tree.grid_remove()
            self.placeholder.grid()
            self.set_title('No folder opened')
    
    def create_root(self):
        t = threading.Thread(target=self.run_create_root)
        t.daemon = True
        t.start()

    def run_create_root(self):
        self.files = []
        self.update_treeview([(p, os.path.join(self.path, p)) for p in os.listdir(self.path)])

        for path, item in list(self.nodes.items()):
            if not os.path.exists(path):
                self.tree.delete(item)
                self.nodes.pop(path)
                
        self.actionset = ActionSet("Search files by name", "file:", self.files)

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
            entries.append((entry.name, entry.path))
        return entries

    def update_treeview(self, entries, parent=""):
        entries.sort(key=lambda x: (not os.path.isdir(x[1]), x[0]))
        for name, path in entries:
            if os.path.isdir(path):
                if name in self.ignore_dirs:
                    continue
                if path in self.nodes.keys():    
                    continue
                item = self.tree.tree.insert(parent, "end", text=f"  {name}", values=[path, 'directory'], image='foldericon', open=False)
                self.nodes[path] = item
                self.update_treeview(self.scandir(path), item)
            else:
                if name.split(".")[-1] in self.ignore_exts:
                    continue
                if path in self.nodes.keys():    
                    continue
                    
                #TODO check filetype and get matching icon, cases
                item = self.tree.tree.insert(parent, "end", text=f"  {name}", values=[path, 'file'], image='document')
                self.nodes[path] = item

                # for the actionset
                self.files.append((name, lambda _, path=path: self.base.open_editor(path)))
    
    def new_file(self, filename):
        if not filename:
            return

        parent = self.tree.selected_path() if self.tree.selected_type() != 'file' else self.tree.parent_selected()
        path = os.path.join(parent, filename)
        with open(path, 'w+') as f:
            f.write("")
        self.create_root()
    
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
        self.create_root()

    def close_directory(self):
        self.change_path(None)
    
    def openfile(self, _):
        if self.tree.selected_type() != 'file':
            return

        path = self.tree.selected_path()
        self.base.open_editor(path)

    def preview_file(self, _):
        #TODO preview editors -- extra preview param for editors
        return