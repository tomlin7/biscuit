from __future__ import annotations

import tkinter as tk
import typing
from tkinter.messagebox import askyesno

from src.biscuit.common.ui import Frame, IconButton

from .menu import EditorsbarMenu
from .tab import Tab

if typing.TYPE_CHECKING:
    from src.biscuit.editor import Editor

    from .manager import EditorsManager


class TabBar(Frame):
    """Tab Bar for Editors

    - Manages the tabs
    - Manages the action buttons for the tabs
    """

    def __init__(self, master: EditorsManager, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.layout.content.editors.bar)
        self.master = master

        self.tabs: list[Tab] = []
        self.active_tab = None

        self.tabs = Frame(self)
        self.tabs.pack(fill=tk.BOTH, side=tk.LEFT, expand=True)

        self.menu = EditorsbarMenu(self, "tabs")
        self.menu.add_item(
            "Show Opened Editors", lambda: self.base.palette.show("active:")
        )
        self.menu.add_separator(10)
        self.menu.add_item("Close All", self.master.delete_all_editors)

        self.buttons = []
        self.default_buttons = (("ellipsis", self.menu.show),)

        self.container = Frame(self, **self.base.theme.layout.content.editors.bar)
        self.container.pack(fill=tk.BOTH, side=tk.RIGHT, padx=(0, 10))

        for button in self.default_buttons:
            IconButton(self.container, *button).pack(side=tk.RIGHT)

    def add_buttons(self, buttons: list[IconButton]) -> None:
        for button in buttons:
            button.pack(side=tk.LEFT)
            self.buttons.append(button)

    def replace_buttons(self, buttons: list[IconButton]) -> None:
        self.clear()
        self.add_buttons(buttons)

    def clear_buttons(self) -> None:
        for button in self.buttons:
            button.pack_forget()
        self.buttons.clear()

    def add_tab(self, editor: Editor) -> None:
        tab = Tab(self, editor)
        tab.pack(fill=tk.Y, side=tk.LEFT, padx=(0, 1), in_=self.tabs)
        self.tabs.append(tab)

        tab.select()

    def close_active_tab(self) -> None:
        self.close_tab(self.active_tab)

    def save_unsaved_changes(self, e) -> None:
        if e.content and e.content.editable and e.content.unsaved_changes:
            if askyesno(
                f"Unsaved changes",
                f"Do you want to save the changes you made to {e.filename}",
            ):
                if e.exists:
                    e.save()
                else:
                    self.base.commands.save_file_as()
                print(f"Saved changes to {e.path}.")

    def close_tab(self, tab: Tab) -> None:
        if e := tab.editor:
            self.save_unsaved_changes(e)

        try:
            i = self.tabs.index(tab)
        except ValueError:
            # most probably in case of diff editors, not handled
            return

        was_selected = tab == self.active_tab

        assert self.tabs.pop(i) == tab
        tab.destroy()
        self.master.master.close_editor(tab.editor)

        if not was_selected:
            return

        if self.tabs:
            if i < len(self.tabs):
                self.tabs[i].select()
            else:
                self.tabs[i - 1].select()
        else:
            self.active_tab = None

    def close_tab_helper(self, editor: str) -> None:
        for tab in self.tabs:
            if tab.editor == editor:
                try:
                    self.tabs.remove(tab)
                    tab.destroy()
                except ValueError:
                    return

    def delete_tab(self, editor: Editor):
        for tab in self.tabs:
            if tab.editor == editor:
                self.tabs.remove(tab)
                tab.destroy()
                return

    def set_active_tab(self, selected_tab: Tab) -> None:
        self.active_tab = selected_tab
        if selected_tab.editor.content:
            self.master.replace_buttons(selected_tab.editor.content.__buttons__)
        for tab in self.tabs:
            if tab != selected_tab:
                tab.deselect()
        self.master.master.refresh()

    def clear_all_tabs(self) -> None:
        for tab in self.tabs:
            tab.destroy()

        self.tabs.clear()

    def switch_tabs(self, path: str) -> None:
        for tab in self.tabs:
            if tab.editor.path == path:
                tab.select()
                return tab.editor
