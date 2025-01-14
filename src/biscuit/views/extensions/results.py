from __future__ import annotations

import queue
import threading
import tkinter as tk
import typing

from biscuit.common.ui import ScrollableFrame

from ..sidebar_item import SideBarViewItem
from .extension import ExtensionGUI
from .placeholder import ExtensionsPlaceholder

if typing.TYPE_CHECKING:
    from biscuit.extensions import ExtensionManager


class ExtensionsList(ScrollableFrame):
    items: list[ExtensionGUI]

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.views.sidebar.background)


class Results(SideBarViewItem):
    """View that displays the available extensions.
    # TODO search filter for extensions

    The Results view displays the available extensions.
    - The user can install, uninstall, search for extensions.
    """

    manager: ExtensionManager
    fetch_queue: queue.Queue
    fetching: threading.Event

    def __init__(self, master, *args, **kwargs) -> None:
        self.__actions__ = ()
        self.title = "Available"

        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.views.sidebar.item)

        self.placeholder = ExtensionsPlaceholder(self)
        self.extension_list = ExtensionsList(self.content)
        self.extension_list.pack(fill=tk.BOTH, expand=True)
        self.master = master

        self.filter_installed = False

        # self.watcher = ExtensionsWatcher(self)
        # self.watcher.watch()

        # TODO list installed extensions separately

    def late_setup(self) -> None:
        self.manager = self.base.extensions_manager
        self.fetch_queue = self.manager.fetch_queue
        self.fetching = self.manager.fetching

    def show_content(self) -> None:
        self.extension_list.pack(in_=self.content, fill=tk.BOTH, expand=True)
        self.placeholder.pack_forget()

    def show_placeholder(self) -> None:
        self.extension_list.pack_forget()
        self.placeholder.pack(in_=self.content, fill=tk.BOTH, expand=True)

    def refresh(self, *_) -> None:
        if self.base.testing:
            return

        self.clear()
        self.update_idletasks()
        self.after(5, self.manager.run_fetch_extensions())

    def gui_refresh_loop(self) -> None:
        if not self.fetch_queue.empty():
            name, data = self.fetch_queue.get()
            ext = ExtensionGUI(self, name, data)
            if not self.filter_installed or (self.filter_installed and ext.installed):
                self.extension_list.add(ext, fill=tk.X)

        self.after(5, self.gui_refresh_loop)

    def clear(self, *_) -> None:
        for widget in self.extension_list.items:
            widget.pack_forget()
            widget.destroy()
            self.content.update_idletasks()

        self.extension_list.items = []
        self.fetching.set()

    def set_selected(self, extension: ExtensionGUI) -> None:
        for widget in self.extension_list.items:
            if widget == extension:
                widget.select()
            else:
                widget.deselect()

        self.manager.open_extension(extension)

    def toggle_installed(self) -> None:
        self.filter_installed = not self.filter_installed
        self.refresh()

    def search(self) -> None:
        if self.base.testing:
            return

        self.clear()
        self.update_idletasks()
        self.manager.display_filtered_extensions(self.master.searchbox.get())
