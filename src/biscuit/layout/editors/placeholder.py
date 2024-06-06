from __future__ import annotations

import tkinter as tk
import typing

from src.biscuit.editor.editorbase import BaseEditor

from .shortcuts import Shortcuts

if typing.TYPE_CHECKING:
    from . import EditorsManager


class Placeholder(BaseEditor):
    """Placeholder for the Editors Manager

    - Placeholder for the Editors
    - Shows the shortcuts
    """

    def __init__(self, master: EditorsManager, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(bd=0, relief=tk.FLAT, **self.base.theme.editors)

        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)

        try:
            self.logo = tk.Label(
                self,
                image=self.base.settings.resources.logo,
                **self.base.theme.editors.labels,
            )
            self.logo.grid(row=0, column=0)
        except tk.TclError:
            pass

        self.shortcuts = Shortcuts(self, **self.base.theme.editors)
        self.shortcuts.grid(row=1, column=0, pady=(0, 40))

        self.shortcuts.add_shortcut("Show all commands", ["Ctrl", "Shift", "p"])
        self.shortcuts.add_shortcut("Toggle terminal", ["Ctrl", "`"])
        self.shortcuts.add_shortcut("Open Folder", ["Ctrl", "Shift", "o"])

        self.bind("<Double-Button-1>", self.base.commands.new_file)
