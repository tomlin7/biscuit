from __future__ import annotations

import bdb
import os
import sys
import threading
import types
import typing

from .base import DebuggerBase

if typing.TYPE_CHECKING:
    from biscuit.editor import TextEditor

    from .manager import DebuggerManager


def get_callstack(frame):
    while frame:
        yield (
            frame.f_code.co_name,
            os.path.abspath(frame.f_code.co_filename),
            frame.f_lineno,
        )
        frame = frame.f_back


class PythonDebugger(DebuggerBase, bdb.Bdb):
    def __init__(self, manager: DebuggerManager):
        DebuggerBase.__init__(self, manager)
        bdb.Bdb.__init__(self)
        self.current_frame = None
        self.is_running = False
        self.paused = threading.Event()
        self.command = None
        self.latest_path = ""

    def launch(self, path: str) -> None:
        self.reset()
        self.base.drawer.show_debug()
        self.latest_path = path

        with open(path, "r") as f:
            code = compile(f.read(), path, "exec")

        self.clear_all_breaks()
        for path, lines in self.breakpoints.items():
            for line in lines:
                self.set_break(path.replace("\\", "/"), line)

        globals_dict = {
            "__name__": "__main__",
            "__file__": path,
            "__builtins__": __builtins__,
        }

        self.is_running = True
        threading.Thread(
            target=self._run_debugger, args=(code, globals_dict), daemon=True
        ).start()

    def _run_debugger(self, code, globals_dict):
        self.set_trace()
        try:
            exec(code, globals_dict)
        finally:
            self.is_running = False
            self.variables.clear()
            self.callstack.clear()

    def user_line(self, frame):
        if self.break_here(frame):
            self.paused.clear()
            self.current_frame = frame
            self.variables.show(frame.f_locals.items())
            self.callstack.show(get_callstack(frame))
            # self.manager.base.update_debug_view()  # Update UI to show we're paused
            self.paused.wait()  # Wait for user input

    def stop(self):
        self.is_running = False
        self.set_quit()
        self.paused.set()  # Release any waiting threads

    def restart(self):
        self.stop()
        self.launch(self.latest_path)

    def step_in(self):
        self.set_step()
        self.paused.set()

    def step_over(self):
        self.set_next(self.current_frame)
        self.paused.set()

    def step_out(self):
        self.set_return(self.current_frame)
        self.paused.set()

    def continue_(self):
        self.set_continue()
        self.paused.set()
