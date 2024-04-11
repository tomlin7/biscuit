import tkinter as tk
import tkinter.ttk as ttk

from .frame import Frame
from .scrollbar import Scrollbar


class Tree(Frame):
    def __init__(self, master, startpath=None, doubleclick=lambda _: None, singleclick=lambda _: None, columns=("fullpath", "type"), *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.utils.tree)

        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)

        self.path = startpath
        self.doubleclick = doubleclick
        self.singleclick = singleclick

        self.tree = ttk.Treeview(self, show="tree", columns=columns, 
                                 displaycolumns='', selectmode=tk.BROWSE)
        self.tree.grid(row=0, column=0, sticky=tk.NSEW)
        
        self.scrollbar = Scrollbar(self, orient=tk.VERTICAL, command=self.tree.yview, style="TreeScrollbar")
        self.scrollbar.grid(row=0, column=1, sticky=tk.NS)

        self.tree.config(yscrollcommand=self.scrollbar.set)
        self.scrollbar.config(command=self.tree.yview)
        
        self.bind("<Double-Button-1>", self.doubleclick)
        self.bind("<<TreeviewSelect>>", self.check_singleclick)
    
    def bind(self, *args, **kwargs) -> None:
        self.tree.bind(*args, **kwargs)

    def check_singleclick(self, _) -> None:
        if self.item_type(self.focus()) == 'file':
            if self.singleclick:
                self.singleclick(self.item_fullpath(self.focus()))
        else:
            self.toggle_node(self.focus())
    
    def clear_node(self, node) -> None:
        self.tree.delete(*self.tree.get_children(node))

    def clear_tree(self) -> None:
        self.clear_node('')

    def collapse_all(self) -> None:
        for node in self.tree.get_children():
            self.tree.item(node, open=False)
    
    def delete(self, *a, **kw) -> None:
        self.tree.delete(*a, *kw)
    
    def focus(self, *args) -> str:
        return self.tree.focus(*args) or ''

    def get_children(self, *a, **kw) -> str:
        return self.tree.get_children(*a, **kw)

    def identify_row(self, y) -> str:
        return self.tree.identify_row(y)

    def insert(self, *args, **kwargs):
        return self.tree.insert(*args, **kwargs)
        
    def is_open(self, node):
        return self.tree.item(node, "open")
    
    def item(self, *a, **kw):
        return self.tree.item(*a, **kw)
        
    def item_type(self, item):
        return self.set(item, "type")
    
    def item_fullpath(self, item):
        return self.set(item, "fullpath")
    
    def parent(self, *args, **kwargs):
        return self.tree.parent(*args, **kwargs)
    
    def parent_selected(self):
        return self.parent(self.focus())

    def selected_parent_path(self):
        return self.item_fullpath(self.parent_selected())
    
    def selection_set(self, *args, **kwargs):
        return self.tree.selection_set(*args, **kwargs)

    def selected_path(self):
        return self.item_fullpath(self.focus())

    def selected_type(self):
        return self.item_type(self.focus())

    def set(self, *args, **kwargs):
        return self.tree.set(*args, **kwargs)

    def toggle_node(self, node) -> None:
        if self.item_type(node) == 'directory':
            if self.is_open(node):
                self.tree.item(node, open=False)
            else:
                self.tree.item(node, open=True)
                self.tree.event_generate("<<Open>>")
