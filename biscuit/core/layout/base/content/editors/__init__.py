"""
Holds the editors and provides an interface to manage the editor tabs.

+---------------------------------+
| File1.txt | File2.py |          |
+---------------------------------+
| \    \    \    \    \    \    \ |
|  \    \    \    \    \    \    \|
|   \    \    \    \    \    \    |
|    \    \    \    \    \    \   |
|\    \    \    \    \    \    \  |
+---------------------------------+
"""
from __future__ import annotations

import typing
from typing import List, Union

from biscuit.core.components.editors.editor import BaseEditor
from biscuit.core.components.floating.palette.actionset import ActionSet

if typing.TYPE_CHECKING:
    from .. import ContentPane

import os
import tkinter as tk

from biscuit.core.components.editors import Editor, Welcome
from biscuit.core.components.games import Game
from biscuit.core.components.utils import Frame

from .editorsbar import Editorsbar
from .empty import Empty


class EditorsPane(Frame):
    """Tabbed container for editors."""
    def __init__(self, master: ContentPane, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.border)

        self.grid_propagate(False)
        self.grid_rowconfigure(1, weight=1)
        self.grid_columnconfigure(0, weight=1)

        self.editorsbar = Editorsbar(self)
        self.editorsbar.grid(row=0, column=0, sticky=tk.EW, pady=(0,1))
        self.tabs = self.editorsbar.tabs

        self.editors: List[Editor] = []
        self.closed_editors: List[Editor] = {}

        self.empty = True
        self.emptytab = Empty(self)
        self.emptytab.grid(column=0, row=1, sticky=tk.NSEW)

        self.default_editors: List[Editor] = [Welcome(self)]
        self.actionset = ActionSet("Switch to active editors", "active:", [])
        self.base.palette.register_actionset(self.get_active_actionset)

    def get_active_actionset(self) -> ActionSet:
        "Generates the active editors actionset"
        self.actionset.update([(editor.filename, editor) for editor in self.editors])
        return self.actionset

    def add_default_editors(self) -> None:
        "Adds all default editors"
        self.add_editors(self.default_editors)

    def add_editors(self, editors: list[Editor]) -> None:
        "Append <Editor>s to list. Create tabs for them."
        for editor in editors:
            self.add_editor(editor)

    def add_editor(self, editor: Union[Editor,BaseEditor]) -> None:
        "Appends a editor to list. Create a tab."
        self.editors.append(editor)
        if editor.content:
            editor.content.create_buttons(self.editorsbar.container)
        self.tabs.add_tab(editor)

    def delete_all_editors(self) -> None:
        "Permanently delete all editors."
        for editor in self.editors:
            editor.destroy()

        self.editorsbar.clear()
        self.tabs.clear_all_tabs()
        self.editors.clear()

    def open_editor(self, path: str, exists: bool) -> None:
        "open Editor with path and exists values passed"
        if path in self.closed_editors:
            return self.add_editor(self.closed_editors[path])
        self.add_editor(Editor(self, path, exists))

    def open_diff_editor(self, path: str, exists: bool) -> None:
        "open Editor with path and exists values passed"
        self.add_editor(Editor(self, path, exists, diff=True))

    def open_game(self, name: str) -> None:
        "opens a game with passed id/name"
        self.add_editor(Game(self, name))

    def close_editor(self, editor: Editor) -> None:
        "removes an editor, keeping it in cache."
        self.editors.remove(editor)

        # not keeping diff/games in cache
        if not editor.diff and editor.content:
            self.closed_editors[editor.path] = editor
        else:
            editor.destroy()

    def close_active_editor(self) -> None:
        "Closes the active tab"
        self.tabs.close_active_tab()

    def delete_editor(self, editor: Editor) -> None:
        "Permanently delete a editor."
        self.editors.remove(editor)
        if editor.path in self.closed_editors:
            self.closed_editors.remove(editor)

        editor.destroy()

    def set_active_editor(self, editor: Editor) -> None:
        "set an existing editor to currently shown one"
        for tab in self.tabs.tabs:
            if tab.editor == editor:
                self.tabs.set_active_tab(tab)

    @property
    def active_editor(self) -> Editor:
        "Get active editor."
        if not self.tabs.active_tab:
            return

        return self.tabs.active_tab.editor

    def refresh(self) -> None:
        if not self.editors and self.empty:
            self.emptytab.grid()
            self.base.set_title(os.path.basename(self.base.active_directory) if self.base.active_directory else None)
        elif self.editors and not self.empty:
            self.emptytab.grid_remove()
        self.empty = not self.empty
        self.base.update_statusbar()
