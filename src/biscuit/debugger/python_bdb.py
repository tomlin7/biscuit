from __future__ import annotations

import bdb
import typing

from .base import Debugger

if typing.TYPE_CHECKING:
    from biscuit.editor import TextEditor


class PythonDebugger(Debugger, bdb.Bdb):
    """Python debugger class.

    This class is used to debug Python code. It uses python's standard bdb and
    overrides some of its methods to provide custom functionality. The debugger
    information is displayed in the side bar debug view."""

    def __init__(self, editor: TextEditor):
        """Initialize the debugger.

        Args:
            editor (TextEditor): the editor instance"""

        super().__init__(editor)

    def run(self, *_):
        """Debug the code in the editor."""

        self.reset()

        with open(self.file_path, "r") as f:
            code = compile(f.read(), self.file_path, "exec")

        self.clear_all_breaks()
        for line_number in self.editor.breakpoints:
            self.set_break(self.file_path, line_number)

        self.set_trace()
        exec(code, globals(), locals())

    def user_line(self, frame):
        self.variables.show(frame)
        self.callstack.show(frame)
        self.set_continue()
