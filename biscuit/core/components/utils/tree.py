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

        self.file_icn = tk.PhotoImage(data="""
        iVBORw0KGgoAAAANSUhEUgAAAA0AAAARCAYAAAAG/yacAAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d2FyZQB
        3d3cuaW5rc2NhcGUub3Jnm+48GgAAAUNJREFUKJHVzzFLQmEUxvH/uaipF0EbW1rEsWyLJCirKShszIKMoqnFrU9Re+YSak
        MtTU3XhnCLhj5GIEJeu5re06KScpXWnunlvM+P876SuvmIBEPhK1UyQIzRdPSbleqR+fp7aASC4UtVjj0AQED81DYr9tIIE
        sgAqMuulTXFypoCmgNQoQj4XFfvtir23BABs0Cnemg+jq8R9EWVU5B4zxUr/fA1P0AArsfTAKgemEWEM9AEjr6vlpsLxqQy
        gKrEAax9syDKOWjEr1LzeZUFw1EUgYt02d5G6SogIh1VNT1Rr9N+MvyBGsIyyuLwwnVdRPBEz7lYA0iNzzdK9huQnPqnSfk
        nSP5S1n7fAOrAzPqtvTMNrJWaSSAB1CVdsq+Bk/7CT9CuhxEg2j8XfG2nlQ+GwoYqe6BRDzBIA7hvO638D0khbw04aabsAA
        AAAElFTkSuQmCC""")
        self.folder_icn = tk.PhotoImage(data="""
        iVBORw0KGgoAAAANSUhEUgAAABAAAAAMCAYAAABr5z2BAAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d2FyZQB
        3d3cuaW5rc2NhcGUub3Jnm+48GgAAAJBJREFUKJHdzTEKwkAUhOF/loCFRbAVr+IhLAWLCPaW3sFGPIOm1Bt4hxSSEwRs7Z
        UdayErmnROO++bp93htJK0BUa8pxEq1ovZhQ/R/ni+G/LWEjW2y4Stx4NnmUU7l9R6YTxBbFLfb49sGlL4m9ieh84aAA17D
        sCfDLiHdwDqrlpwDTHGAqiA+IONQIW0fAFkySdEGFdeCgAAAABJRU5ErkJggg==""")
        
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
