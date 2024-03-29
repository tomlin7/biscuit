import json
import queue
import threading
import tkinter as tk

import requests

from ..item import SidebarViewItem
from .extension import Extension
from .placeholder import ExtensionsPlaceholder
from .watcher import ExtensionsWatcher


class Results(SidebarViewItem):
    def __init__(self, master, *args, **kwargs) -> None:
        self.__buttons__ = (('sync', self.refresh),)
        self.title = 'Available'
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.views.sidebar.item)

        self.extensions = {}

        self.placeholder = ExtensionsPlaceholder(self)
        
        self.repo_url = "https://raw.githubusercontent.com/billyeatcookies/biscuit-extensions/main/"
        self.list_url = self.repo_url + "extensions.json"

        self.queue = queue.Queue()

        # self.watcher = ExtensionsWatcher(self)
        # self.watcher.watch()

        #TODO list installed extensions separately

        self.fetching = threading.Event()
        self.extensions_lock = threading.Lock()

    def refresh(self, *_) -> None:
        if self.base.testing:
            return

        self.clear()
        self.update_idletasks()
        self.after(5, self.run_fetch_list())

    def run_fetch_list(self, *_) -> None:
        if self.base.testing:
            return

        if self.fetching.is_set():
            self.fetching.wait()

        with self.extensions_lock: 
            threading.Thread(target=self.fetch_list, daemon=True).start()

    def fetch_list(self) -> None:
        response = None
        try:
            response = requests.get(self.list_url)
        except Exception as e:
            pass
            
        if not response or response.status_code != 200:
            self.placeholder.pack(in_=self.content, fill=tk.BOTH, expand=True)
            return
        
        self.extensions = json.loads(response.text)
        if self.extensions:
            self.placeholder.pack_forget()

        for name, data in self.extensions.items():
            #TODO add further loops for folders
            self.queue.put((name, data))
    
    def gui_refresh_loop(self) -> None:
        if not self.queue.empty():
            name, data = self.queue.get()
            ext = Extension(self, name, data)
            ext.pack(in_=self.content, fill=tk.X)
        
        self.after(5, self.gui_refresh_loop)

    def clear(self, *_) -> None:
        for widget in self.content.winfo_children():
            widget.destroy()
            self.content.update_idletasks()

        self.fetching.set()
