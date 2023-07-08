import tkinter as tk
import requests, threading, toml

from .extension import Extension
from ..item import SidebarViewItem

class Results(SidebarViewItem):
    def __init__(self, master, *args, **kwargs):
        self.__buttons__ = (('discard',), ('add',))
        self.title = 'Available'
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.views.sidebar.item)

        self.repo_url = "https://raw.githubusercontent.com/billyeatcookies/biscuit-extensions/main/"
        self.list_url = self.repo_url + "extensions.toml"

        self.run_fetch_list()
        
    def run_fetch_list(self):
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
            Extension(self.content, name, self.repo_url+file).pack(fill=tk.X)
