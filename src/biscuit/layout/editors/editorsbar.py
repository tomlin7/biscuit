from __future__ import annotations

import tkinter as tk
import typing
from tkinter.messagebox import askyesno

from biscuit.common.icons import Icons
from biscuit.common.ui import Frame, IconButton
from biscuit.editor import BreadCrumbs

from .menu import EditorsbarMenu
from .tab import Tab
from .tabscroll import TabScroll

if typing.TYPE_CHECKING:
    from biscuit.editor import Editor

    from .manager import EditorsManager


class EditorsBar(Frame):
    """Editors Bar for Editors

    - Manages the tabs
    - Manages the action buttons for the tabs
    """

    def __init__(self, master: EditorsManager, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.layout.content.editors.bar)
        self.master: EditorsManager = master

        self.major_container = Frame(self, **self.base.theme.layout.content.editors.bar)
        self.major_container.pack(fill=tk.BOTH, expand=True)

        self.active_tabs: list[Tab] = []
        self.active_tab = None

        self.tab_control_container = TabScroll(self.major_container)
        self.tab_control_container.pack(fill=tk.Y, side=tk.LEFT)

        self.tab_container = Frame(self.major_container, bg=self.base.theme.border)
        self.tab_container.pack(fill=tk.BOTH, side=tk.LEFT)

        self.menu = EditorsbarMenu(self.major_container, "tabs")
        self.menu.add_command(
            "Show Opened Editors", lambda: self.base.palette.show("active:")
        )
        self.menu.add_separator(10)
        self.menu.add_command("Close All", self.master.delete_all_editors)

        self.buttons: list[IconButton] = []
        self.default_buttons = (
            (Icons.ELLIPSIS, self.menu.show),
            (Icons.ADD, self.base.commands.open_empty_editor),
        )

        self.action_container = Frame(
            self.major_container, **self.base.theme.layout.content.editors.bar
        )
        self.action_container.pack(fill=tk.BOTH, side=tk.RIGHT, padx=(0, 10))

        for button in self.default_buttons:
            if isinstance(button, list | tuple):
                IconButton(
                    self.action_container, iconsize=12, pady=6, hfg_only=True, *button
                ).pack(side=tk.RIGHT, fill=tk.Y)
            else:
                IconButton(self.action_container, **button).pack(
                    side=tk.RIGHT, fill=tk.Y
                )

        self.secondary_container = Frame(
            self, **self.base.theme.layout.content.editors.bar
        )
        self.secondary_container.pack(fill=tk.BOTH, expand=True)

        self.breadcrumbs = BreadCrumbs(self.secondary_container)

    def hide_breadcrumbs(self) -> None:
        self.breadcrumbs.hide()

    def show_breadcrumbs(self) -> None:
        self.breadcrumbs.show()

    def hide_tab_container(self) -> None:
        self.tab_container.pack_forget()

    def show_tab_container(self) -> None:
        self.tab_container.pack(
            fill=tk.BOTH, side=tk.LEFT, before=self.action_container
        )

    def add_buttons(self, buttons: list[IconButton]) -> None:
        for button in buttons:
            button.pack(side=tk.LEFT)
            self.buttons.append(button)

    def replace_buttons(self, buttons: list[IconButton]) -> None:
        self.clear_buttons()
        self.add_buttons(buttons)

    def clear_buttons(self) -> None:
        for button in self.buttons:
            button.pack_forget()
        self.buttons.clear()

    def add_tab(self, editor: Editor) -> None:
        tab = Tab(self, editor)
        tab.pack(fill=tk.Y, side=tk.LEFT, padx=(0, 1), in_=self.tab_container)
        self.active_tabs.append(tab)

        tab.select()

    def close_active_tab(self) -> None:
        if self.active_tab:
            self.close_tab(self.active_tab)

    def save_unsaved_changes(self, e: Editor) -> None:
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
            i = self.active_tabs.index(tab)
        except ValueError:
            # most probably in case of diff editors, not handled
            return

        was_selected = tab == self.active_tab

        assert self.active_tabs.pop(i) == tab
        self.master.close_editor(tab.editor)
        tab.destroy()

        if not was_selected:
            return

        if self.active_tabs:
            if i < len(self.active_tabs):
                self.active_tabs[i].select()
            else:
                self.active_tabs[i - 1].select()
        else:
            self.active_tab = None

    def close_tab_helper(self, editor: Editor) -> None:
        for tab in self.active_tabs:
            if tab.editor == editor:
                try:
                    self.active_tabs.remove(tab)
                    tab.destroy()
                except ValueError:
                    return

    def delete_tab(self, editor: Editor):
        for tab in self.active_tabs:
            if tab.editor == editor:
                self.active_tabs.remove(tab)
                tab.destroy()
                return

    def set_active_tab(self, selected_tab: Tab) -> None:
        self.active_tab = selected_tab
        if selected_tab.editor.content:
            self.replace_buttons(selected_tab.editor.content.__buttons__)
        else:
            self.clear_buttons()
        for tab in self.active_tabs:
            if tab != selected_tab:
                tab.deselect()
        self.master.refresh()

    def clear_all_tabs(self) -> None:
        for tab in self.active_tabs:
            tab.destroy()

        self.active_tabs.clear()
        self.active_tab = None

    def switch_tabs(self, path: str) -> None:
        for tab in self.active_tabs:
            if tab.editor.path == path:
                tab.select()
                return tab.editor

    def scroll_left(self) -> None: ...
    def scroll_right(self) -> None: ...
