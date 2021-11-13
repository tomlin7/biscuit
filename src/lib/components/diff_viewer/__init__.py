import tkinter as tk

from .content import DiffViewerContent


class DiffViewer(tk.Frame):
    def __init__(self, master, path, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master
        self.path = path

        self.content = DiffViewerContent(self, path)
        self.content.pack(fill=tk.BOTH, expand=True)
