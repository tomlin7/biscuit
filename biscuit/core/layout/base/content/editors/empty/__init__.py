from __future__ import annotations

import typing

if typing.TYPE_CHECKING:
    from .. import EditorsPane

import tkinter as tk

from biscuit.core.utils import Frame

from .shortcuts import Shortcuts


class Empty(Frame):
    def __init__(self, master: EditorsPane, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(bd=0, relief=tk.FLAT, **self.base.theme.editors)

        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)

        try:
            self.logo = tk.Label(self, image=self.base.settings.res.logo, **self.base.theme.editors.labels)
            self.logo.grid(row=0, column=0)
        except tk.TclError:
            pass

        self.shortcuts = Shortcuts(self, **self.base.theme.editors)
        self.shortcuts.grid(row=1, column=0, pady=(0, 40))

        self.shortcuts.add_shortcut("Show all commands", ["Ctrl", "Shift", "p"])
        self.shortcuts.add_shortcut("Toggle terminal", ["Ctrl", "`"])
        self.shortcuts.add_shortcut("Open Folder", ["Ctrl", "Shift", "o"])

        self.bind("<Double-Button-1>", self.base.commands.new_file)

    # TODO drop to open
    # def drop(self, event: tk.Event):
    #     if os.path.isfile(event.data):
    #         self.base.open_editor(event.data, exists=True)
    #     elif os.path.isdir(event.data):
    #         self.base.commands.open_in_new_window(dir=event.data)
