import os, threading
import tkinter.ttk as ttk
import tkinter as tk


class Tree(ttk.Treeview):
    def __init__(self, master, double_click=None, single_click=None, startpath=None, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base
        self.double_click = double_click
        self.single_click = single_click

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
        
        self.config(
            show="tree", columns=("fullpath", "type"), displaycolumns='')
        
        if startpath:
            self.open_directory(startpath)
        else:
            self.insert('', 0, text='You have not yet opened a folder.')

        self.bind('<Double-Button-1>', self.double_click)
        self.bind("<<TreeviewSelect>>", self.check_single_click)
        self.bind("<<TreeviewOpen>>", self.update_tree)

    def check_single_click(self, _):
        if self.item_type(self.focus()) == 'file':
            if self.single_click:
                self.single_click(self.item_fullpath(self.focus()))
        else:
            self.open_node(self.focus())
        
    def open_node(self, node):
        if self.item_type(node) == 'directory':
            self.item(node, open=True)
            self.update_node(node)
    
    def clear_node(self, node):
        self.delete(*self.get_children(node))

    def clear_tree(self):
        self.clear_node('')

    def fill_node(self, node, path):
        self.clear_node(node)

        items = [os.path.join(path, p) for p in os.listdir(path)]

        directories = sorted([p for p in items if os.path.isdir(p)])
        files = sorted([p for p in items if os.path.isfile(p)])

        for p in directories:
            name = os.path.split(p)[1]
            oid = self.insert(node, tk.END, text=f"  {name}", values=[p, 'directory'], image=self.folder_icn)
            self.insert(oid, 0, text='dummy')
    
        for p in files:
            if os.path.isfile(p):
                name = os.path.split(p)[1]
                oid = self.insert(node, tk.END, text=f"  {name}", values=[p, 'file'], image=self.file_icn)


    def update_node(self, node):
        if self.set(node, "type") != 'directory':
            return

        path = self.set(node, "fullpath")
        self.fill_node(node, path)

    def update_tree(self, *_):
        self.update_node(self.focus())

    def create_root(self, startpath):
        self.clear_tree()
        self.fill_node('', startpath)
    
    def item_type(self, item):
        return self.set(item, "type")
    
    def item_fullpath(self, item):
        return self.set(item, "fullpath")

    def open_directory(self, path):
        threading.Thread(target=self.create_root, args=[path]).start()
