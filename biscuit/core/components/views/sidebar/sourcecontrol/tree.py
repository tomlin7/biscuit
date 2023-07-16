import tkinter as tk

from .item import TreeItem

from core.components.utils import Frame


class Tree(Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.views)

        self.menu_items = []
        self.row = 0

    def clear_tree(self, *_):
        try:
            for item in self.menu_items:
                item.grid_forget()
                item.destroy()
        except:
            pass        
        self.row = 0
    
    def add_item(self, text):
        new_item = TreeItem(self, text)
        new_item.grid(row=self.row, sticky=tk.EW, pady=0)
        self.menu_items.append(new_item)

        self.row += 1
    
    def get_commit_message(self):
        return self.master.master.get_commit_message()
