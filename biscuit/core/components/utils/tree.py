import tkinter.ttk as ttk
import tkinter as tk
from tkinter.constants import *

from .scrollbar import Scrollbar


class Tree(tk.Frame):
    def __init__(self, master, startpath=None, double_click=lambda _: None, single_click=lambda _: None, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)

        self.path = startpath
        self.double_click = double_click
        self.single_click = single_click

        self.tree = ttk.Treeview(self, show="tree", columns=("fullpath", "type"), displaycolumns='', selectmode=tk.BROWSE)
        self.tree.grid(row=0, column=0, sticky=NSEW)
        
        self.scrollbar = Scrollbar(self, orient=tk.VERTICAL, command=self.tree.yview, style="TreeScrollbar")
        self.scrollbar.grid(row=0, column=1, sticky=tk.NS)

        self.tree.config(yscrollcommand=self.scrollbar.set)
        self.scrollbar.config(command=self.tree.yview)
        
        self.bind('<Double-Button-1>', self.double_click)
        self.bind("<<TreeviewSelect>>", self.check_single_click)

    def check_single_click(self, _):
        if self.item_type(self.focus()) == 'file':
            if self.single_click:
                self.single_click(self.item_fullpath(self.focus()))
        else:
            self.toggle_node(self.focus())
    
    def clear_node(self, node):
        self.tree.delete(*self.tree.get_children(node))

    def clear_tree(self):
        self.clear_node('')

    def collapse_all(self):
        for node in self.tree.get_children():
            self.tree.item(node, open=False)
    
    def focus(self):
        return self.tree.focus()
    
    def insert(self, *args, **kwargs):
        return self.tree.insert(*args, **kwargs)
        
    def is_open(self, node):
        return self.tree.item(node, "open")
    
    def item(self, *args, **kwargs):
        return self.tree.item(*args, **kwargs)
        
    def item_type(self, item):
        return self.set(item, "type")
    
    def item_fullpath(self, item):
        return self.set(item, "fullpath")

    def set(self, *args, **kwargs):
        return self.tree.set(*args, **kwargs)

    def toggle_node(self, node):
        if self.item_type(node) == 'directory':
            if self.is_open(node):
                self.tree.item(node, open=False)
            else:
                self.tree.item(node, open=True)
