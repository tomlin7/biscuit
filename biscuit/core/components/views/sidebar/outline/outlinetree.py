import tkinter as tk
from tkinter import ttk

from biscuit.core.components.floating.palette.actionset import ActionSet
from biscuit.core.components.lsp.data import OutlineItem
from biscuit.core.components.utils import Frame

from .placeholder import OutlineTreePlaceholder


class OutlineTree(Frame):
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)

        self.nodes: dict[str, str] = {}
        self.actionset = ActionSet("Goto symbol in Editor", "@", [])

        self.tree = ttk.Treeview(self, show="tree", columns=("kind", "pos"), displaycolumns='', 
                                 selectmode=tk.BROWSE, *args, **kwargs)
        self.tree.grid(row=0, column=0, sticky=tk.NSEW)
        self.tree.grid_remove()

        self.placeholder = OutlineTreePlaceholder(self)
        self.placeholder.grid(row=0, column=0, sticky=tk.NSEW)
    
    def clear(self) -> None:
        self.tree.delete(*self.tree.get_children())

    def update_symbols(self, response: list[OutlineItem]) -> None:
        if not response:
            self.placeholder.grid()
            self.tree.grid_remove()
            return
    
        self.placeholder.grid_remove()
        self.tree.grid()

        self.clear()
        self._add_items('', response)
    
    def _add_items(self, parent: str, items: list[OutlineItem]) -> None:
        for item in items:
            if item.parent:
                parent = self.nodes[item.parent]
            id = self.tree.insert(parent, 'end', text=item.name, values=(item.kind, item.start), open=True)
            self.nodes[item.name] = id
            
            self._add_items(id, item.children)

    def collapse_all(self, *_) -> None:
        for node in self.tree.get_children(''):
            self.tree.item(node, open=False)
            
    def goto_symbol(self, _: str) -> None:
        item = self.tree.item(self.tree.focus())
        if item:
            self.base.goto_location(item.values[1], item.values[2])
