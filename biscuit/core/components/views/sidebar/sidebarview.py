import tkinter as tk
from tkinter.constants import *

from ..view import View
from ...utils import IconButton

class SidebarView(View):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.pack_propagate(False)
        self.config(width=250, bg='#f8f8f8')

        top = tk.Frame(self, bg='#f8f8f8')
        top.base = self.base
        top.pack(fill=X, padx=(15, 10), pady=5)
        top.grid_columnconfigure(0, weight=1)

        tk.Label(top, text=self.__class__.__name__.upper(), anchor=W,
            fg="grey", bg='#f8f8f8').grid(row=0, column=0, sticky=EW)
        
        column = 1
        for i in self.__buttons__:
            IconButton(top, *i).grid(row=0, column=column, sticky=E)
            column += 1
    
    def add_widget(self, widget, *args, **kwargs):
        widget.pack(fill=BOTH, expand=True, *args, **kwargs)
