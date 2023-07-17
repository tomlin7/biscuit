import tkinter as tk

from .item import TreeItem

from core.components.utils import Frame


class Tree(Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.views.sidebar.item)
        self.items = []

    def clear_tree(self, *_):
        for item in self.items:
            try:
                item.destroy()
            except:
                pass
    def add_item(self, text, kind):
        new_item = TreeItem(self, text, kind)
        new_item.pack(fill=tk.X)
        self.items.append(new_item)
    
    def get_commit_message(self):
        return self.master.get_commit_message()
