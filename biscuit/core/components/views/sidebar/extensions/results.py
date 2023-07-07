import tkinter as tk
import requests, threading, toml

from core.components.utils import Frame, Text

class Results(Frame):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.config(**self.base.theme.layout.base.sidebar)

        self.repo_url = "https://raw.githubusercontent.com/billyeatcookies/biscuit-extensions/main/"
        self.list_url = self.repo_url + "extensions.toml"

        self.text = Text(self, relief=tk.FLAT, highlightthickness=0, **self.base.theme.editors)
        self.text.pack(fill=tk.BOTH, expand=True)

        self.run(self.fetch_list)
        
    def run(self, fn):
        fetch_thread = threading.Thread(target=fn)
        fetch_thread.start()

    def fetch_list(self):
        response = requests.get(self.list_url)
        if response.status_code == 200:
            self.extensions = toml.loads(response.text)
            self.load_extensions()

    def load_extensions(self):
        for _, file in self.extensions.items():
            #TODO add further loops for folders
            self.load_extension(self.repo_url+file)

    def load_extension(self, file):
        response = requests.get(file)
        if response.status_code == 200:
            self.text.insert(tk.INSERT, response.text)
