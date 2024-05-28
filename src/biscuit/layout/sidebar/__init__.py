"""
Sidebar holds the actionbar and the sidebar-view holder frame
"""

from __future__ import annotations

import tkinter as tk
import typing

if typing.TYPE_CHECKING:
    from .. import BaseFrame
    from src.biscuit.components.views import SidebarView

from src.biscuit.components.views.sidebar import *
from src.biscuit.utils import Frame

from .slots import Slots


class Sidebar(Frame):
    """Vertically slotted container for views."""
    def __init__(self, master: BaseFrame, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.border)

        self.rowconfigure(0, weight=1)
        self.columnconfigure(1, weight=1)

        self.slots = Slots(self)
        self.slots.grid(sticky=tk.NS, column=0, row=0, padx=(0, 1))

        self.views = []

        self.default_views = [Explorer(self), Outline(self), Search(self), SourceControl(self), Debug(self), AI(self), GitHub(self), Extensions(self)]
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

    def create_view(self, name: str, icon: str="browser") -> SidebarView:
        "Creates a new view from name and icon and returns it."

        view = SidebarView(self, name, icon)
        self.add_view(view)
        return view

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
    def outline(self) -> Outline:
        "Get outline view."

        return self.default_views[1]

    @property
    def search(self) -> Search:
        "Get search view."

        return self.default_views[2]

    @property
    def source_control(self) -> SourceControl:
        "Get source control view."
        
        return self.default_views[3]

    @property
    def debug(self) -> Debug:
        "Get debugger view."
        
        return self.default_views[4]
    
    @property
    def ai(self) -> AI:
        "Get AI view."
        
        return self.default_views[5]

    @property
    def github(self) -> GitHub:
        "Get GitHub view."
        
        return self.default_views[6]

    @property
    def extensions(self) -> Extensions:
        "Get extensions view."
        
        return self.default_views[7]

    def show_view(self, view: SidebarView) -> None:
        "Show a view."
        
        for i in self.slots.slots:
            if i.view == view:
                self.slots.set_active_slot(i)
                i.enable()
                break

    def show_explorer(self) -> None:
        "Show explorer view."
        
        self.show_view(self.default_views[0])

    def show_outline(self) -> None:
        "Show outline view."
        
        self.show_view(self.default_views[1])

    def show_search(self) -> None:
        "Show search view."
        
        self.show_view(self.default_views[2])

    def show_source_control(self) -> None:
        "Show source control view."
        
        self.show_view(self.default_views[3])

    def show_debug(self) -> None:
        "Show debug view."
        
        self.show_view(self.default_views[4])

    def show_extensions(self) -> None:
        "Show extensions view."
        
        self.show_view(self.default_views[5])
