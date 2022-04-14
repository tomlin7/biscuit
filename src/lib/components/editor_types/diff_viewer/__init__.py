import tkinter as tk

from .content import DiffViewerContent
from ...breadcrumbs import BreadCrumbs


class DiffViewer(tk.Frame):
    def __init__(self, master, path, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master
        self.path = path

        self.breadcrumbs = BreadCrumbs(master=self, path=path.replace('/', '\\'))
        self.breadcrumbs.pack(side=tk.TOP, fill=tk.X)

        self.content = DiffViewerContent(self, path)
        self.content.pack(fill=tk.BOTH, expand=True)
