from __future__ import annotations

import tkinter as tk
import typing
from tkinter.messagebox import askyesno

from biscuit.common.icons import Icons
from biscuit.common.ui import Frame, IconButton

from .menu import EditorsbarMenu

if typing.TYPE_CHECKING:
    from biscuit.editor import Editor

    from .manager import EditorsManager


class EditorsBar(Frame):
    """Editors Bar for Editors

    - Manages action buttons for the editor area
    - Shows breadcrumbs for the active editor
    """

    def __init__(self, master: EditorsManager, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.layout.content.editors.bar)
        self.master: EditorsManager = master

        self.major_container = Frame(self, **self.base.theme.layout.content.editors.bar)
        self.major_container.pack(fill=tk.BOTH, expand=True)

        self.tab_container = Frame(self.major_container, bg=self.base.theme.border)

        self.menu = EditorsbarMenu(self.major_container, "tabs")
        self.menu.add_command(
            "Show Opened Editors", lambda: self.base.palette.show("active:")
        )
        self.menu.add_command(
            "Restore Last Closed Editor", self.base.commands.restore_last_closed_editor
        )
        self.menu.add_separator(10)
        self.menu.add_command("Split Editor", self.base.commands.split_editor)
        self.menu.add_command("Close All", self.master.delete_all_editors)

        self.buttons: list[IconButton] = []
        self.default_buttons = (
            (Icons.ELLIPSIS, self.menu.show),
            (Icons.CHEVRON_DOWN, self.base.open_editors.show),
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

    def switch_tabs(self, path: str) -> None:
        for pane in self.master.panes:
            for tab in pane.active_tabs:
                if tab.editor.path == path:
                    tab.select()
                    return tab.editor
