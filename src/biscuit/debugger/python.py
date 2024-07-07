from __future__ import annotations

import bdb
import os
import sys
import threading
import typing

from .base import DebuggerBase
from .pyutils import *

if typing.TYPE_CHECKING:
    from .manager import DebuggerManager


class PythonDebugger(DebuggerBase, bdb.Bdb):
    """Python debugger implementation using the built-in `bdb` module.
    Uses biscuit's debugger base class to interact with the app."""

    def __init__(self, manager: DebuggerManager):
        DebuggerBase.__init__(self, manager)
        bdb.Bdb.__init__(self)
        self.current_frame = None
        self.is_running = False
        self.debug = self.base.debug

        # Event to pause the debugger
        self.debugging = threading.Event()

        self.latest_path = ""

    def launch(self, path: str) -> None:
        self.reset()
        self.base.drawer.show_debug()
        self.latest_path = path

        script_dir = os.path.dirname(os.path.abspath(path))
        if script_dir not in sys.path:
            sys.path.insert(0, script_dir)

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
        self.thread = threading.Thread(
            target=self._run_debugger,
            name="Python Debugger Thread",
            args=(code, globals_dict, script_dir),
            daemon=True,
        )
        self.thread.start()

    def _run_debugger(self, code, globals_dict, script_dir):
        original_cwd = os.getcwd()
        try:
            os.chdir(script_dir)
            self.set_trace()

            # Update UI
            self.debug.reset()
            self.debug.set_running()

            exec(code, globals_dict)
        except bdb.BdbQuit:
            pass
        except Exception as e:
            print(f"Debugger internal error: {e}")
        finally:
            os.chdir(original_cwd)
            self.is_running = False

            # Update UI
            self.debug.reset()

    def user_line(self, frame):
        self.debug.reset()
        if self.break_here(frame):
            self.debugging.clear()
            self.current_frame = frame

            for d in get_variables(frame):
                self.variables.show(*d)
            self.callstack.show(get_callstack(frame))

            self.debug.set_paused()  # Update UI to show we're paused
            self.debugging.wait()  # Wait for user input

    def user_return(self, frame, return_value): ...

    def user_exception(self, frame, exc_info):
        self.debugging.clear()
        self.current_frame = frame
        self.variables.show(frame.f_locals.items())
        self.callstack.show(get_callstack(frame))
        self.debug.set_paused()
        self.debugging.wait()

    def stop(self):
        self.is_running = False
        self.set_quit()
        self.debugging.set()  # Release any waiting threads

    def restart(self):
        self.stop()
        self.launch(self.latest_path)

    def step_in(self):
        self.set_step()
        self.debugging.set()

    def step_over(self):
        self.set_next(self.current_frame)
        self.debugging.set()

    def step_out(self):
        self.set_return(self.current_frame)
        self.debugging.set()

    def continue_pause(self):
        self.set_continue()

        if self.debugging.is_set():
            self.debugging.clear()
        else:
            self.debugging.set()
