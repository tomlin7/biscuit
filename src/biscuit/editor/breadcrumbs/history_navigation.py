from __future__ import annotations

import os
import tkinter as tk
import typing

from biscuit.common.icons import Icons
from biscuit.common.ui import Frame, IconButton

if typing.TYPE_CHECKING:
    from .breadcrumbs import BreadCrumbs


class HistoryNavigation(Frame):
    """History navigation widget

    History navigation widget is used to navigate the history of the cursor
    position in the editor.
    """

    def __init__(self, master: BreadCrumbs, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master: BreadCrumbs = master
        self.config(bg=self.base.theme.border)

        self.left = IconButton(
            self,
            Icons.ARROW_LEFT,
            event=self.go_down,
            iconsize=12,
            padx=7,
            hfg_only=True,
        )
        self.left.config(**self.base.theme.editors.breadcrumbs.item)

        self.right = IconButton(
            self,
            Icons.ARROW_RIGHT,
            event=self.go_up,
            iconsize=12,
            padx=7,
            hfg_only=True,
        )
        self.right.config(**self.base.theme.editors.breadcrumbs.item)

        self.left.config(state=tk.DISABLED)
        self.right.config(state=tk.DISABLED)

        self.left.pack(side=tk.LEFT, fill=tk.BOTH)
        self.right.pack(side=tk.RIGHT, fill=tk.BOTH)

    def update_buttons(self) -> None:
        editor = getattr(self.base.editorsmanager, "active_editor", None)
        if not editor or not hasattr(editor, "content"):
            self.left.config(state=tk.DISABLED)
            self.right.config(state=tk.DISABLED)
            return

        history = getattr(editor.content, "cursor_history", [])
        index = getattr(editor.content, "cursor_history_index", -1)

        self.left.config(state=tk.NORMAL if index > 0 else tk.DISABLED)
        self.right.config(state=tk.NORMAL if index < len(history) - 1 else tk.DISABLED)

    def go_down(self, *_) -> None:
        """Navigate backward in cursor history."""
        editor = getattr(self.base.editorsmanager, "active_editor", None)
        if not editor or not hasattr(editor, "content"):
            return

        content = editor.content
        history = getattr(content, "cursor_history", [])
        index = getattr(content, "cursor_history_index", -1)

        if index > 0 and history:
            content.cursor_history_index = index - 1
            pos = history[content.cursor_history_index]
            if hasattr(content, "text"):
                content.text.mark_set(tk.INSERT, pos)
                content.text.see(pos)
            self.update_buttons()

    def go_up(self, *_) -> None:
        """Navigate forward in cursor history."""
        editor = getattr(self.base.editorsmanager, "active_editor", None)
        if not editor or not hasattr(editor, "content"):
            return

        content = editor.content
        history = getattr(content, "cursor_history", [])
        index = getattr(content, "cursor_history_index", -1)

        if index < len(history) - 1:
            content.cursor_history_index = index + 1
            pos = history[content.cursor_history_index]
            if hasattr(content, "text"):
                content.text.mark_set(tk.INSERT, pos)
                content.text.see(pos)
            self.update_buttons()
