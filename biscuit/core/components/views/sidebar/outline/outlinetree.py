from __future__ import annotations

import tkinter as tk
import typing
from tkinter import ttk

import tarts as lsp

from biscuit.core.components.floating.palette.actionset import ActionSet
from biscuit.core.utils import Frame

from .placeholder import OutlineTreePlaceholder
from .tree import Tree

if typing.TYPE_CHECKING:
    from biscuit.core.components.editors.texteditor import Text



class OutlineTree(Frame):
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)

        self.actionset = ActionSet("Goto symbol in Editor", "@", [])

        # self.tree = ttk.Treeview(self, show="tree", columns=("kind", "pos"), displaycolumns='', 
        #                          selectmode=tk.BROWSE, *args, **kwargs)
        self.tree = Tree(self)
        self.tree.grid(row=0, column=0, sticky=tk.NSEW)
        self.tree.grid_remove()

        self.scrollbar = ttk.Scrollbar(self, orient=tk.VERTICAL, command=self.tree.yview, style="TreeScrollbar")
        self.scrollbar.grid(row=0, column=1, sticky=tk.NS)
        self.scrollbar.grid_remove()

        self.tree.config(yscrollcommand=self.scrollbar.set)
        self.scrollbar.config(command=self.tree.yview)

        self.placeholder = OutlineTreePlaceholder(self)
        self.placeholder.grid(row=0, column=0, sticky=tk.NSEW)

        self.bind("<Double-Button-1>", self.goto_symbol)
    
    def clear(self) -> None:
        # self.tree.delete(*self.tree.get_children())
        self.tree.delete('1.0', tk.END)

    def update_symbols(self, tab: Text=None, response: list[lsp.DocumentSymbol]=None) -> None:
        if not response:
            self.placeholder.show(tab)
            self.tree.grid_remove()
            self.scrollbar.grid_remove()
            return
    
        self.placeholder.grid_remove()
        self.tree.grid()
        self.scrollbar.grid()

        self.tree.config(state=tk.NORMAL)
        self.clear()
        self.tree.add_items(response)
        self.tree.config(state=tk.DISABLED)
    
    def add_items(self, parent: str, items: list[lsp.DocumentSymbol]) -> None:
        if not items:
            return
        
        for item in items:
            if item.kind == lsp.SymbolKind.MODULE:
                continue
            id = self.tree.insert(parent, 'end', text=item.name, values=(item.range.start), open=True)
            self.add_items(id, item.children)

    def collapse_all(self, *_) -> None:
        for node in self.tree.get_children(''):
            self.tree.item(node, open=False)
            
    def goto_symbol(self, _: str) -> None:
        item = self.tree.item(self.tree.focus())
        if item:
            self.base.goto_location_in_active_editor(item.values[1])
