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
        self.shown = {}

        self.repo_url = "https://raw.githubusercontent.com/billyeatcookies/biscuit-extensions/main/"
        self.list_url = self.repo_url + "extensions.toml"

        self.watcher = ExtensionsWatcher(self)
        self.watcher.watch()

        #TODO list installed extensions separately

        self.run_fetch_list()
    
    def refresh(self):
        if self.base.testing:
            return
        
        self.run_fetch_list()
        self.base.extensionsmanager.refresh_extensions()
        self.base.extensionsmanager.restart_server()
    
    def run_fetch_list(self):        
        if self.base.testing:
            return
        
        threading.Thread(target=self.fetch_list).start()

    def fetch_list(self):
        response = requests.get(self.list_url)
        if response.status_code == 200:
            self.extensions = toml.loads(response.text)
            self.load_extensions()
    
    def load_extensions(self):
        for name, file in self.extensions.items():
            #TODO add further loops for folders
            #TODO add author, description
            if name in self.shown.keys():
                continue

            ext = Extension(self.content, name, file, f"{self.repo_url}extensions/{file}")
            ext.pack(fill=tk.X)
            self.shown[name] = ext
