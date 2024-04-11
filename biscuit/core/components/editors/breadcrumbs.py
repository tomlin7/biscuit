import os
import tkinter as tk
from pathlib import Path

from biscuit.core.utils import Frame, IconLabelButton


class Item(IconLabelButton):
    def __init__(self, master, path: str, text: str, function, *args, **kwargs) -> None:
        super().__init__(master, text=text, pady=0, padx=0, icon="chevron-right", function=function, iconside=tk.RIGHT)
        self.path = path
        self.text_label.config(padx=0, pady=0, font=("Segoe UI", 11))
        self.icon_label.config(padx=0, pady=0, font=("codicon", 12))
    
    def on_click(self, e: tk.Event):
        self.function(self)

class BreadCrumbs(Frame):
    def __init__(self, master, path: str=None, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(padx=10, **self.base.theme.editors.breadcrumbs)

        self.pathview = self.base.pathview
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
        path = Path(path).resolve()
        for i, item in enumerate(path.parts):
            text = item if item == path.parts[-1] else f"{item}"
            if not i:
                self.additem(Path(item), text)
                continue
            self.additem(Path(*path.parts[:i]), text)
        return path

    def add_relative(self, path):
        active = self.base.active_directory
        path = os.path.relpath(path, active).split(os.path.sep)      
        for i, item in enumerate(path):
            text = item if item == path[-1] else f"{item}" 
            self.additem(os.path.join(active, *path[:i]), text)

    def additem(self, path, text):
        btn = Item(self, path, text, self.pathview.show)
        btn.pack(side=tk.LEFT)
