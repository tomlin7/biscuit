import threading
import tkinter as tk

import requests
import toml

from ..item import SidebarViewItem
from .extension import Extension
from .watcher import ExtensionsWatcher


class Results(SidebarViewItem):
    def __init__(self, master, *args, **kwargs) -> None:
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

    def refresh(self) -> None:
        if self.base.testing:
            return

        self.update_idletasks()
        self.after(5, self.run_fetch_list())

    def run_fetch_list(self, *_) -> None:
        if self.base.testing:
            return

        if self.fetching_list.is_set():
            self.fetching_list.wait()

        with self.extensions_lock: 
            threading.Thread(target=self.fetch_list).start()

    def fetch_list(self) -> None:
        try:
            response = requests.get(self.list_url)
        except Exception as e:
            try:
                self.base.logger.error(f"Fetching extensions failed: {e}")
                return
            except Exception:
                pass

        if not response.status_code == 200:
            return

        self.clear()
        self.extensions = toml.loads(response.text)

        for name, data in self.extensions.items():
            #TODO add further loops for folders
            #TODO add author, description
            ext = Extension(self, name, data)
            ext.pack(in_=self.content, fill=tk.X)

    def clear(self, *_) -> None:
        for widget in self.content.winfo_children():
            widget.destroy()
            self.content.update_idletasks()

        self.fetching_list.set()
