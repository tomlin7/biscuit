import tkinter as tk
from tkinter.constants import *

from core.components.utils import Frame, IconButton

from biscuit.core.components.utils import Frame, IconButton

from ..view import View


class SidebarView(View):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.__buttons__ = ()
        self.__icon__ = 'preview'
        self.__name__ = self.__class__.__name__
        
        self.pack_propagate(False)
        self.config(width=300, **self.base.theme.views.sidebar)

        top = Frame(self, **self.base.theme.views.sidebar)
        top.pack(fill=X, padx=(15, 10), pady=7)
        top.grid_columnconfigure(0, weight=1)

        tk.Label(top, text=self.__class__.__name__.upper(), anchor=W, font=("Segoi UI", 8),
                 **self.base.theme.views.sidebar.title).grid(row=0, column=0, sticky=EW)
        
        column = 1
        for i in self.__buttons__:
            IconButton(top, *i).grid(row=0, column=column, sticky=E)
            column += 1
    
    def add_widget(self, widget, *args, **kwargs):
        widget.pack(fill=BOTH, expand=True, *args, **kwargs)
