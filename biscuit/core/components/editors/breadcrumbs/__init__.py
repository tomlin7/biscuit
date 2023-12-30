import os
import tkinter as tk

from ...utils import Frame, Menubutton
from .pathview import PathView


class Item(Menubutton):
    def __init__(self, master, path, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.path = path
        self.config(height=1, pady=2, padx=1, **self.base.theme.editors.breadcrumbs.item)

class BreadCrumbs(Frame):
    def __init__(self, master, path=None, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(padx=10, **self.base.theme.editors.breadcrumbs)

        self.pathview = PathView(self)
        active = self.base.active_directory  # just to make it shorter lol

        try:
            # if the file belongs to active directory, use relative path instead
            if (active and os.path.commonpath([active, os.path.abspath(path)]) == os.path.abspath(active)):
                return self.add_relative(path)
            
        except ValueError:
            # mostly happens when paths don't have the same drive
            pass

        # otherwise, use the absolute path
        self.add_absolute(path)

    def add_absolute(self, path):
        path = os.path.abspath(path).split(os.path.sep)
        for i, item in enumerate(path):
            text = item if item == path[-1] else f"{item} ›"
            self.additem(os.path.join(*path[:i] or os.path.sep), text)
        return path

    def add_relative(self, path):
        active = self.base.active_directory
        path = os.path.relpath(path, active).split(os.path.sep)      
        for i, item in enumerate(path):
            text = item if item == path[-1] else f"{item} ›"
            self.additem(os.path.join(active, *path[:i]), text)

    def additem(self, path, text):
        btn = Item(self, path, text=text)
        btn.bind("<Button-1>", self.pathview.show)
        btn.pack(side=tk.LEFT)
