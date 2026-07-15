from __future__ import annotations

import tkinter as tk
import typing

from biscuit.common.ui import Frame
from biscuit.layout.editors.placeholder import Placeholder

if typing.TYPE_CHECKING:
    from biscuit.editor import Editor
    from .manager import EditorsManager


class EditorPane(Frame):
    def __init__(self, master, editors_manager: EditorsManager, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.editors_manager = editors_manager
        self.config(bg=self.base.theme.border)

        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)

        self.active_editor: Editor | None = None
        self.placeholder = Placeholder(self)
        self.placeholder.grid(row=0, column=0, sticky=tk.NSEW)

        self.bind("<Button-1>", self.focus_pane)
        self.placeholder.bind("<Button-1>", self.focus_pane)

    def focus_pane(self, *_) -> None:
        self.editors_manager.set_active_pane(self)

    def set_active_editor(self, editor: Editor | None) -> None:
        if self.active_editor and self.active_editor != editor:
            self.active_editor.grid_remove()

        if editor:
            editor.grid(row=0, column=0, sticky=tk.NSEW, in_=self)
            editor.tkraise()
            self.placeholder.grid_remove()
        else:
            self.placeholder.grid()

        self.active_editor = editor

    def clear(self) -> None:
        if self.active_editor:
            self.active_editor.grid_remove()
            self.active_editor = None
        self.placeholder.grid()
