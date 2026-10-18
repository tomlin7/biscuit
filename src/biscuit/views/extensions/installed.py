from __future__ import annotations

import tkinter as tk
import typing

from ..sidebar_item import SideBarViewItem
from .placeholder import ExtensionsPlaceholder
from .results import ExtensionsList

if typing.TYPE_CHECKING:
    from .extension import ExtensionGUI


class Installed(SideBarViewItem):
    """View that displays installed extensions separately from marketplace results."""

    def __init__(self, master, *args, **kwargs) -> None:
        self.__actions__ = ()
        self.title = "Installed"

        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.views.sidebar.item)

        self.placeholder = ExtensionsPlaceholder(self)
        self.extension_list = ExtensionsList(self.content)
        self.extension_list.pack(fill=tk.BOTH, expand=True)

    def add_extension(self, extension: ExtensionGUI) -> None:
        self.extension_list.add(extension, fill=tk.X)

    def clear(self) -> None:
        for widget in self.extension_list.items:
            widget.pack_forget()
            widget.destroy()
        self.extension_list.items = []
