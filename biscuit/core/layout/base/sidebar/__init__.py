"""
Sidebar holds the actionbar and the sidebar-view holder frame
+------+--------------------------+
| Dir  |    \    \    \    \    \ |
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
from __future__ import annotations

import tkinter as tk
import typing

if typing.TYPE_CHECKING:
    from .. import BaseFrame
    from biscuit.core.components.views import SidebarView

from biscuit.core.components.utils import Frame
from biscuit.core.components.views.sidebar import *

from .slots import Slots


class Sidebar(Frame):
    """
    Vertically slotted container for views.
    """
    def __init__(self, master: BaseFrame, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.border)

        self.rowconfigure(0, weight=1)
        self.columnconfigure(1, weight=1)

        self.slots = Slots(self)
        self.slots.grid(sticky=tk.NS, column=0, row=0, padx=(0, 1))

        self.views = []

        self.default_views = [Explorer(self), Search(self), SourceControl(self), Extensions(self)]
        self.add_views(self.default_views)
        self.slots.toggle_first_slot()

    def add_views(self, views: list[SidebarView]) -> None:
        "Append views to list. Create tabs for them."
        for view in views:
            self.add_view(view)
    
    def add_view(self, view: SidebarView) -> None:
        "Appends a view to list. Create a tab."
        self.views.append(view)
        self.slots.add_slot(view)
        
    def delete_all_views(self) -> None:
        "Permanently delete all views."
        for view in self.views:
            view.destroy()

        self.views.clear()
    
    def delete_view(self, view: SidebarView) -> None:
        "Permanently delete a view."
        view.destroy()
        self.views.remove(view)
    
    @property
    def explorer(self) -> Explorer:
        "Get explorer view."
        return self.default_views[0]

    @property
    def search(self) -> Search:
        "Get search view."
        return self.default_views[1]

    @property
    def source_control(self) -> SourceControl:
        "Get source control view."
        return self.default_views[2]

    @property
    def extensions(self) -> Extensions:
        "Get source control view."
        return self.default_views[3]

    def show_view(self, view: SidebarView) -> None:
        "Show a view."
        self.slots.set_active_slot(view)
    
    def show_explorer(self) -> None:
        "Show explorer view."
        self.show_view(self.default_views[0])

    def show_search(self) -> None:
        "Show search view."
        self.show_view(self.default_views[1])

    def show_source_control(self) -> None:
        "Show source control view."
        self.show_view(self.default_views[2])

    def show_extensions(self) -> None:
        "Show extensions view."
        self.show_view(self.default_views[3])
