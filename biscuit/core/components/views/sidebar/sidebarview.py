import tkinter as tk
from ..view import View
from ...utils import IconButton

class SidebarView(View):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.pack_propagate(False)
        self.config(width=230)

        top = tk.Frame(self)
        top.base = self.base
        top.pack(fill=tk.X, padx=10, pady=10)
        top.grid_columnconfigure(0, weight=1)

        tk.Label(top, text=self.__class__.__name__.upper(), anchor=tk.W,
            fg="grey").grid(row=0, column=0, sticky=tk.EW)
        
        column = 1
        for i in self.__buttons__:
            IconButton(top, *i).grid(row=0, column=column, sticky=tk.E)
            column += 1
    
    def add_widget(self, widget, *args, **kwargs):
        widget.pack(fill=tk.BOTH, expand=True, *args, **kwargs)
