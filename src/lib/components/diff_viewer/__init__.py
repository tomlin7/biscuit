import tkinter as tk

from .content import DiffViewerContent
from ..editor import EditorPath


class DiffViewer(tk.Frame):
    def __init__(self, master, path, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master
        self.path = path

        self.path_view = EditorPath(master=self, path=path.replace('/', '\\'))
        self.path_view.pack(side=tk.TOP, fill=tk.X)

        self.content = DiffViewerContent(self, path)
        self.content.pack(fill=tk.BOTH, expand=True)
