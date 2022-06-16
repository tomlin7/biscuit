import tkinter as tk
from tkinter.constants import *

from ......components.editors import Tabsbar


class EditorsFrame:
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.pack_propagate(False)

        self.tabs = Tabsbar(self)
        self.tabs.pack(expand=1, fill=tk.BOTH)

        self.active_view = None
        self.editors = []

        self.default_views = []
        self.add_views(self.default_views)

    def add_views(self, views):
        "Append views to list. Create tabs for them."
        for view in views:
            self.add_view(view)
    
    def add_view(self, view):
        "Appends a view to list. Create a tab."
        self.editors.append(view)
        self.tabs.add_tab(view)
        self.set_active_view(view)
        
    def delete_all_views(self):
        "Permanently delete all views."
        for view in self.editors:
            view.destroy()

        self.editors.clear()
    
    def delete_view(self, view):
        "Permanently delete a view."
        view.destroy()
        self.editors.remove(view)
    
    def set_active_view(self, view):
        "Set active view and active tab."
        self.active_view = view
        for _view in self.editors:
            _view.pack_forget()
        view.pack(fill=tk.BOTH)
    
    def get_logger(self):
        return self.default_views[0]
    
    def get_terminal(self):
        return self.default_views[1]
