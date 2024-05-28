import tkinter as tk
import typing

from src.biscuit.components.views.sidebar.item import SidebarViewItem
from src.biscuit.utils import Frame, IconButton

from ..view import View


class SidebarView(View):
    """Base class of Sidebar views"""
    __buttons__ = []

    def __init__(self, master, name:str=None, icon: str=None, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.__icon__ = icon or 'preview'
        self.name = name or "View"
        self.__name__ = self.__class__.__name__
        
        self.pack_propagate(False)
        self.config(width=300, **self.base.theme.views.sidebar)

        self.top = Frame(self, **self.base.theme.views.sidebar)
        self.top.pack(fill=tk.X, padx=(15, 10), pady=7)
        self.top.grid_columnconfigure(0, weight=1)

        tk.Label(self.top, text=self.__class__.__name__.upper(), anchor=tk.W, font=("Segoi UI", 8),
                 **self.base.theme.views.sidebar.title).grid(row=0, column=0, sticky=tk.EW)
        
        self.column = 1
        if not self.__buttons__:
            return
        
        for i in self.__buttons__:
            IconButton(self.top, *i).grid(row=0, column=self.column, sticky=tk.E)
            self.column += 1
    
    def add_button(self, icon: str, event) -> None:
        IconButton(self.top, icon, event).grid(row=0, column=self.column, sticky=tk.E)
        self.column += 1
        
    def add_item(self, widget, *args, **kwargs) -> None:
        widget.pack(fill=tk.BOTH, expand=True, *args, **kwargs)

    def remove_item(self, widget) -> None:
        widget.pack_forget()
        
    def create_item(self, name: str=None):
        item = SidebarViewItem(self, name)
        self.add_item(item)
        return item
