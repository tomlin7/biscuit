import os
import tkinter as tk

from biscuit.core.components.utils import Frame, Menubutton

from .pathview import PathView


class Item(Menubutton):
    def __init__(self, master, path, *args, **kwargs):
        super().__init__(master, font=("Segoe UI", 10), *args, **kwargs)
        self.path = path
        self.config(height=1, pady=2, padx=1, **self.base.theme.editors.breadcrumbs.item)


class BreadCrumbs(Frame):
    def __init__(self, master, path=None, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.config(padx=10, **self.base.theme.editors.breadcrumbs)

        self.pathview = PathView(self)

        # if the file does not belong to active directory, use the absolute path instead
        if not (self.base.active_directory and 
                os.path.commonpath([self.base.active_directory, os.path.abspath(path)]) == os.path.abspath(self.base.active_directory)):
            path = os.path.abspath(path).split('\\')
            for i, item in enumerate(path):
                text = item if item == path[-1] else f"{item} ›"
                self.additem("\\".join(path[:i]), text)
        else:
            # otherwise use the relative path to active directory
            path = os.path.relpath(path, self.base.active_directory).split('\\')        
            for i, item in enumerate(path):
                text = item if item == path[-1] else f"{item} ›"
                self.additem(os.path.join(self.base.active_directory, "\\".join(path[:i])), text)

    def additem(self, path, text):
        btn = Item(self, path, text=text)
        btn.bind("<Button-1>", self.pathview.show)
        btn.pack(side=tk.LEFT)
