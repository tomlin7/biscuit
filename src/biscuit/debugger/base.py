from __future__ import annotations

import typing

if typing.TYPE_CHECKING:
    from biscuit.editor import TextEditor


class Debugger:
    """Abstract debugger base class.
    This class should be inherited by a debugger class that implements the `run` method.

    Attributes:
        editor (TextEditor): the editor instance
        base (App): the base app instance
        file_path (str): the path of the file being debugged
        variables (Variables): the variables pane in the debug view,
            `variables.tree` is the treeview widget for the variables
        callstack (CallStack): the call stack pane in the debug view,
            `callstack.tree` is the treeview widget for the call stack"""

    def __init__(self, editor: TextEditor):
        super().__init__()
        self.editor = self.master = editor
        self.base = editor.base
        self.file_path = self.editor.path
        self.variables = self.base.drawer.debug.variables
        self.callstack = self.base.drawer.debug.callstack

    def run(self, *_):
        """Debug the code in the editor.

        This method should be implemented by the subclass.
        Current editor instance is available as `self.editor`."""

        raise NotImplementedError
