from __future__ import annotations

import tkinter as tk

import tkinterDnD as dnd

from src.biscuit.common.ui import Frame, IconButton


class BaseEditor(Frame):
    """Abstract base class for all editor types in Biscuit.

    This class is not meant to be instantiated directly.

    Attributes:
        path (str): The path of the file being edited.
        path2 (str): The path of the file being compared.
        editable (bool): Whether the editor is editable.
        showpath (bool): Whether to show the path of the file.
        content (str): The content of the file being edited.
        diff (bool): Whether the editor is in diff mode.
        run_command_value (str): The command to run the file.
        language (str): The language of the file being edited.
        standalone (bool): Whether the editor is standalone.
        minimalist (bool): Whether the editor is minimalist.
        exists (bool): Whether the file exists.
        debugger (Any): The debugger instance
        runmenu (Any): The run menu instance
        unsupported (bool): Whether the language is unsupported.
        content_hash (str): The hash of the content of the file.
        text (Any): The text widget of the editor.
        __buttons__ (list): A list of buttons to be added to the editor.
        unsaved_changes: Check if there are unsaved changes in the editor.
        breakpoints: Show the breakpoints in the editor.

    Methods:
        ondrop: Handle the drop event on the editor.
        add_button: Add a button to the editor.
        create_buttons: Create the buttons for the editor.
        save: Save the content of the editor."""

    def __init__(
        self, master, path=None, path2=None, editable=True, *args, **kwargs
    ) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.editors)

        self.path = path
        self.path2 = path2
        self.editable = editable

        self.showpath = False
        self.content = None
        self.diff = False
        self.run_command_value = ""
        self.debugger = None
        self.language = ""
        self.standalone = False
        self.minimalist = False
        self.exists = True
        self.runmenu = None
        self.unsupported = False
        self.content_hash = ""
        self.text = None

        self.__buttons__ = []

        self.register_drop_target(dnd.FILE)
        self.bind("<<Drop>>", self.ondrop)

    def unsaved_changes(self): ...
    def breakpoints(self, *_): ...
    def save(self, *_): ...

    def ondrop(self, event: tk.Event):
        """Handle the drop event on the editor.

        Args:
            event (tkinter.Event): The event object."""

        if not event.data:
            return

        self.base.open(event.data, warn_for_directory=True)

    def add_button(self, *args):
        self.__buttons__.append(args)

    def create_buttons(self, editorsbar):
        try:
            self.__buttons__ = [
                IconButton(editorsbar, *button) for button in self.__buttons__
            ]
        except:
            pass
