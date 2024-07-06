from __future__ import annotations

import bdb
import sys
import threading
import types
import typing

from .base import DebuggerBase

if typing.TYPE_CHECKING:
    from biscuit.editor import TextEditor

    from .manager import DebuggerManager


class PythonDebugger(DebuggerBase, bdb.Bdb):
    def __init__(self, manager: DebuggerManager):
        DebuggerBase.__init__(self, manager)
        bdb.Bdb.__init__(self)
        self.current_frame = None
        self.is_running = False
        self.paused = threading.Event()
        self.command = None

    def launch(self, editor: TextEditor) -> None:
        self.reset()
        self.base.drawer.show_debug()

        with open(editor.path, "r") as f:
            code = compile(f.read(), editor.path, "exec")

        self.clear_all_breaks()
        for path, lines in self.breakpoints.items():
            for line in lines:
                self.set_break(path.replace("\\", "/"), line)

        globals_dict = {
            "__name__": "__main__",
            "__file__": editor.path,
            "__builtins__": __builtins__,
        }

        self.is_running = True
        threading.Thread(target=self._run_debugger, args=(code, globals_dict)).start()

    def _run_debugger(self, code, globals_dict):
        self.set_trace()
        try:
            exec(code, globals_dict)
        finally:
            sys.settrace(None)
            self.is_running = False
            self.variables.clear()
            self.callstack.clear()

    def user_line(self, frame):
        if self.break_here(frame):
            self.current_frame = frame
            self.variables.show(frame)
            self.callstack.show(frame)
            # self.manager.base.update_debug_view()  # Update UI to show we're paused
            self.paused.wait()  # Wait for user input
            self.paused.clear()

    def stop(self):
        self.is_running = False
        self.set_quit()
        self.paused.set()  # Release any waiting threads

    def step(self):
        self.command = "step"
        self.paused.set()

    def step_over(self):
        self.command = "next"
        self.paused.set()

    def step_out(self):
        self.command = "return"
        self.paused.set()

    def continue_(self):
        self.command = "continue"
        self.paused.set()
