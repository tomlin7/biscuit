from __future__ import annotations

import bdb
import typing

if typing.TYPE_CHECKING:
    from src.biscuit.components.editors import TextEditor


class PythonDebugger(bdb.Bdb):
    """Python debugger class.
    
    This class is used to debug Python code. It uses python's standard bdb and
    overrides some of its methods to provide custom functionality. The debugger
    information is displayed in a DebuggerInfo window.
    
    Args:
        editor: The TextEditor instance that is being debugged."""

    def __init__(self, editor: TextEditor):
        super().__init__()
        self.editor = self.master = editor
        self.base = editor.base
        self.file_path = self.editor.path
        self.variables = self.base.sidebar.debug.variables
        self.callstack = self.base.sidebar.debug.callstack

    def run(self, *_):
        """Debug the code in the editor."""
        self.reset()

        with open(self.file_path, 'r') as f:
            code = compile(f.read(), self.file_path, 'exec')
        
        self.clear_all_breaks()
        for line_number in self.editor.breakpoints:
            self.set_break(self.file_path, line_number)
        
        self.set_trace()
        exec(code, globals(), locals())
        
    def user_line(self, frame):
        self.variables.show(frame)
        self.callstack.show(frame)
        self.set_continue()
