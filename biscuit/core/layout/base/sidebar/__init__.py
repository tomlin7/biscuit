import tkinter as tk
from tkinter.constants import *

from core.components.utils import Frame
from core.components.views.sidebar import *

from .slots import Slots


class Sidebar(Frame):
    """
    Vertically slotted container for views.

    +------+--------------------------+
    | Diry |    \    \    \    \    \ |
    |------|\    \    \    \    \    \|
    | Src  | \    \    \    \    \    |
    |------|  \    \    \    \    \   |
    | Git  |   \    \    \    \    \  |
    |------|    \    \    \    \    \ |
    | Ext  |\    \    \    \    \    \|
    |------| \    \    \    \    \    |
    |      |  \    \    \    \    \   |
    |      |   \    \    \    \    \  |
    |------|    \    \    \    \    \ |
    | Sett |\    \    \    \    \    \|
    +------+--------------------------+ 
    """
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.border)

        self.rowconfigure(0, weight=1)
        self.columnconfigure(1, weight=1)

        self.slots = Slots(self)
        self.slots.grid(sticky=NS, column=0, row=0, padx=(0, 1))

        self.views = []

        self.default_views = [Explorer(self), Search(self), SourceControl(self), Extensions(self)]
        self.add_views(self.default_views)
        self.slots.toggle_first_slot()

    def add_views(self, views):
        "Append views to list. Create tabs for them."
        for view in views:
            self.add_view(view)
    
    def add_view(self, view):
        "Appends a view to list. Create a tab."
        self.views.append(view)
        self.slots.add_slot(view)
        
    def delete_all_views(self):
        "Permanently delete all views."
        for view in self.views:
            view.destroy()

        self.views.clear()
    
    def delete_view(self, view):
        "Permanently delete a view."
        view.destroy()
        self.views.remove(view)
    
    @property
    def explorer(self):
        "Get explorer view."
        return self.default_views[0]

    @property
    def search(self):
        "Get search view."
        return self.default_views[1]

    @property
    def source_control(self):
        "Get source control view."
        return self.default_views[2]
