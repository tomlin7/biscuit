import tkinter as tk
from tkinter.constants import *

from .panelbar import Panelbar
from biscuit.core.components.views.panel import *
from biscuit.core.components.utils import Frame

class Panel(Frame):
    """
    Tabbed container for views.

    +---------------------------------+
    | Logs | Terminal |               |
    +---------------------------------+
    | \    \    \    \    \    \    \ |
    |  \    \    \    \    \    \    \|
    |   \    \    \    \    \    \    |
    |    \    \    \    \    \    \   |
    |\    \    \    \    \    \    \  |
    +---------------------------------+
    """
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.grid_rowconfigure(1, weight=1)
        self.grid_columnconfigure(0, weight=1)

        self.grid_propagate(False)
        self.config(height=300, **self.base.theme.layout.base.content.panel)

        self.panelbar = Panelbar(self)
        self.panelbar.grid(row=0, column=0, sticky=EW)
        self.tabs = self.panelbar.tabs

        self.views = []

        self.default_views = [Logs(self), Terminal(self)]
        self.add_views(self.default_views)

    def add_views(self, views):
        "Append views to list. Create tabs for them."
        for view in views:
            self.add_view(view)
    
    def add_view(self, view):
        "Appends a view to list. Create a tab."
        self.views.append(view)
        view.create_buttons(self.panelbar)
        
        self.tabs.add_tab(view)

    def delete_all_views(self):
        "Permanently delete all views."
        for view in self.views:
            view.destroy()

        self.views.clear()
    
    def delete_view(self, view):
        "Permanently delete a view."
        view.destroy()
        self.views.remove(view)
    
    def set_active_view(self, view):
        "set an existing editor to currently shown one"
        for tab in self.tabs.tabs:
            if tab.view == view:
                self.tabs.set_active_tab(tab)
    
    @property
    def logger(self):
        return self.default_views[0]
    
    @property
    def terminal(self):
        return self.default_views[1]

    def toggle_panel(self):
        self.master.toggle_panel()
