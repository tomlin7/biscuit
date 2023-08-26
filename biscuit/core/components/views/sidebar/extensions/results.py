import threading
import tkinter as tk

import requests
import toml

from ..item import SidebarViewItem
from .extension import Extension
from .watcher import ExtensionsWatcher


class Results(SidebarViewItem):
    def __init__(self, master, *args, **kwargs):
        self.__buttons__ = (('discard',), ('add',))
        self.title = 'Available'
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.views.sidebar.item)

        self.extensions = {}

        self.repo_url = "https://raw.githubusercontent.com/billyeatcookies/biscuit-extensions/main/"
        self.list_url = self.repo_url + "extensions.toml"

        # self.watcher = ExtensionsWatcher(self)
        # self.watcher.watch()

        #TODO list installed extensions separately

        self.fetching_list = threading.Event()
        self.extensions_lock = threading.Lock()
    
    def refresh(self):
        if self.base.testing:
            return
        
        self.update_idletasks()
        self.after(5, self.run_fetch_list())
    
    def run_fetch_list(self, *_):
        if self.base.testing:
            return
        
        if self.fetching_list.is_set():
            self.fetching_list.wait()
        
        with self.extensions_lock: 
            threading.Thread(target=self.fetch_list).start()

    def fetch_list(self):
        try:
            response = requests.get(self.list_url)
        except Exception as e:
            self.base.logger.error(f"Fetching extensions failed: {e}")
            return
        
        if not response.status_code == 200:
            return
        
        self.clear()
        self.extensions = toml.loads(response.text)

        for name, file in self.extensions.items():
            #TODO add further loops for folders
            #TODO add author, description
            ext = Extension(self, self.content, name, file, f"{self.repo_url}extensions/{file}")
            ext.pack(fill=tk.X)
    
    def clear(self, *_):
        for widget in self.content.winfo_children():
            widget.destroy()
            self.content.update_idletasks()

        self.fetching_list.set()
