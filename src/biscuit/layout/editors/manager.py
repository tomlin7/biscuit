from __future__ import annotations

import os
import tkinter as tk
import typing
from tkinter.messagebox import askyesno
from typing import Dict, List, Union

from src.biscuit.common import ActionSet, Game
from src.biscuit.common.ui import Frame
from src.biscuit.editor import BaseEditor, Editor, Welcome

from .editorsbar import EditorsBar
from .placeholder import Placeholder

if typing.TYPE_CHECKING:
    from ..content import Content


class EditorsManager(Frame):
    """Editors Pane

    - Contains the Editorsbar
    - Manages the Editorsbar
    - Manages the Editors
    """

    def __init__(self, master: Content, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.border)

        self.grid_propagate(False)
        self.grid_rowconfigure(1, weight=1)
        self.grid_columnconfigure(0, weight=1)

        self.editorsbar = EditorsBar(self)
        self.editorsbar.grid(row=0, column=0, sticky=tk.EW, pady=(0, 1))

        self.active_editors: List[Editor] = []
        self.closed_editors: Dict[Editor] = {}

        self.emptytab = Placeholder(self)
        self.emptytab.grid(column=0, row=1, sticky=tk.NSEW)

        self.default_editors: List[Editor] = [Welcome(self)]

    def is_empty(self) -> bool:
        return not self.active_editors

    def is_open(self, path: str) -> bool:
        return any(editor.path == path for editor in self.active_editors)

    def get_active_actionset(self) -> ActionSet:
        self.actionset.update(
            [(editor.filename, editor) for editor in self.active_editors]
        )
        return self.actionset

    def generate_actionsets(self) -> None:
        self.actionset = ActionSet("Switch to active editors", "active:", [])
        self.base.palette.register_actionset(self.get_active_actionset)

        self.base.palette.register_actionset(
            lambda: ActionSet(
                "Configure Run Command",
                "runconf:",
                pinned=[
                    [
                        "Run: {}",
                        lambda command=None, e=self.base.editorsmanager.active_editor: (
                            e.content.set_run_command(command)
                            if command
                            else print("Command can't be empty!")
                        ),
                    ]
                ],
            )
        )

    def add_default_editors(self) -> None:
        self.add_editors(self.default_editors)

    def add_welcome(self) -> None:
        self.add_editor(Welcome(self))

    def add_editors(self, editors: list[Editor]) -> None:
        for editor in editors:
            self.add_editor(editor)

    def add_editor(self, editor: Union[Editor, BaseEditor]) -> Editor | BaseEditor:
        """Add a new editor to the editor pane.

        Args:
            editor (Union[Editor, BaseEditor]): The editor to add."""

        if editor in self.active_editors:
            return self.set_active_editor(editor)

        self.active_editors.append(editor)
        if editor.content:
            editor.content.create_buttons(self.editorsbar.container)
        self.editorsbar.add_tab(editor)
        self.base.explorer.open_editors.add_item(editor)
        self.refresh()
        return editor

    def delete_all_editors(self) -> None:
        for tab in self.editorsbar.active_tabs:
            if e := tab.editor:
                self.editorsbar.save_unsaved_changes(e)
                e.destroy()

        self.editorsbar.clear_all_tabs()
        self.active_editors.clear()
        self.base.explorer.open_editors.clear()
        self.refresh()

    def reopen_active_editor(self, *_) -> None:
        if self.active_editor and self.active_editor.exists:
            self.delete_editor(self.active_editor)
            self.update()
            self.open_editor(self.active_editor.path)

    def reopen_editor(self, path: str):
        if not askyesno(
            "Reopen Editor",
            f"You will lose any unsaved changes to ({path}). Are you sure?",
        ):
            return

        try:
            self.delete_editor(self.get_editor(path))
            self.update()
            self.open_editor(path)
        except Exception as e:
            self.base.logger.error(f"Reopening editor failed: {e}")
            self.base.notifications.error("Reopening editor failed: see logs")

    def open_editor(self, path: str, exists: bool = True) -> Editor | BaseEditor:
        """Open a new editor with the given path.

        Args:
            path (str): The path of the file to open.
            exists (bool, optional): Whether the file exists. Defaults to True.

        Returns:
            Editor: The opened editor."""

        if self.is_open(path):
            return self.editorsbar.switch_tabs(path)
        if path in self.closed_editors:
            return self.add_editor(self.closed_editors[path])
        return self.add_editor(Editor(self, path, exists))

    def open_diff_editor(self, path: str, exists: bool) -> None:
        """Open a new diff editor with the given path.

        Args:
            path (str): The path of the file to open.
            exists (bool): Whether the file exists."""

        self.add_editor(Editor(self, path, exists, diff=True))

    def open_game(self, id: str) -> None:
        """Open a new game editor with the given id.

        Args:
            id (str): The id of the game."""

        self.add_editor(Game(self, id))

    def close_editor(self, editor: Editor) -> None:
        """Closes the given editor.
        Keeps the editor in cache.

        Args:
            editor (Editor): The editor to close."""

        if editor in self.active_editors:
            self.active_editors.remove(editor)
        editor.grid_forget()
        self.refresh()

        if editor.content and editor.content.editable:
            self.base.language_server_manager.tab_closed(editor.content.text)

        # not keeping diff/games in cache
        if editor.content and not (editor.diff or editor.content.unsupported):
            self.closed_editors[editor.path] = editor
        else:
            editor.destroy()
        self.base.explorer.open_editors.remove_item(editor)

    def close_editor_by_path(self, path: str) -> None:
        """Closes the editor with the given path.
        Keeps the editor in cache.

        Args:
            path (str): The path of the editor to close."""

        e = self.get_editor(path)
        self.close_editor(e)
        return e

    def get_editor(self, path: str) -> Editor:
        """Get editor by path.

        Args:
            path (str): The path of the editor to get."""

        for editor in self.active_editors:
            if editor.path == path:
                return editor

    def close_active_editor(self) -> None:
        self.editorsbar.close_active_tab()

    def delete_editor(self, editor: Editor) -> None:
        """Delete the given editor.

        Args:
            editor (Editor): The editor to delete."""

        if editor not in self.active_editors:
            return

        self.active_editors.remove(editor)
        self.editorsbar.delete_tab(editor)
        if editor.path in self.closed_editors:
            self.closed_editors.pop(editor.path)

        editor.destroy()
        self.base.explorer.open_editors.remove_item(editor)
        self.refresh()

    def set_active_editor(self, editor: Editor) -> Editor:
        """Set an existing editor to currently shown one.

        Args:
            editor (Editor): The editor to set as active."""

        for tab in self.editorsbar.active_tabs:
            if tab.editor == editor:
                self.editorsbar.set_active_tab(tab)
        self.base.explorer.open_editors.set_active(editor)

        return editor

    def set_active_editor_by_path(self, path: str) -> Editor:
        """Set an existing editor to currently shown one by path.

        Args:
            path (str): The path of the editor to set as active."""

        for tab in self.editorsbar.active_tabs:
            if tab.editor.path == path:
                self.editorsbar.set_active_tab(tab)
                return tab.editor

    @property
    def active_editor(self) -> Editor:
        if not self.editorsbar.active_tab:
            return

        return self.editorsbar.active_tab.editor

    def refresh(self) -> None:
        if not self.active_editors:
            self.emptytab.grid()
            self.editorsbar.active_tabs.clear()
            self.base.set_title(
                os.path.basename(self.base.active_directory)
                if self.base.active_directory
                else None
            )
        elif self.active_editors:
            self.emptytab.grid_remove()

        self.base.update_statusbar()
        self.base.debug.refresh()
