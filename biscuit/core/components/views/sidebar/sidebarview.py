import tkinter as tk
from ..view import View
from ...utils import IconButton

class SidebarView(View):
    def __init__(self, view, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.pack_propagate(False)
        self.config(width=200)

        top = tk.Frame(self)
        top.base = self.base
        top.pack(fill=tk.X, padx=10, pady=10)
        top.grid_columnconfigure(0, weight=1)

        tk.Label(top, text=view.__class__.__name__.upper(), 
            fg="grey").grid(sticky=tk.W, row=0, column=0)
        
        column = 1
        for i in view.__buttons__:
            IconButton(top, icon=i[0], event=i[1]).grid(row=0, column=column, sticky=tk.E)
            column += 1
