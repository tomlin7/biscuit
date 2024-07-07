from __future__ import annotations

import typing

if typing.TYPE_CHECKING:
    from biscuit.debugger.manager import DebuggerManager
    from biscuit.editor import TextEditor


class DebuggerBase:
    """Abstract debugger base class.
    This class should be inherited by a debugger class that implements the `run` method.

    Attributes:
        manager (DebuggerManager): the debugger manager
        base (App): the base app instance
        breakpoints (dict[str, set[int]]): map of breakpoints set for each file,
            `file_path` -> set of line numbers
        variables (Variables): the variables pane in the debug view,
            `variables.tree` is the treeview widget for the variables
        callstack (CallStack): the call stack pane in the debug view,
            `callstack.tree` is the treeview widget for the call stack
    """

    def __init__(self, manager: DebuggerManager):
        super().__init__()
        self.manager = manager
        self.base = manager.base
        self.variables = self.base.drawer.debug.variables
        self.callstack = self.base.drawer.debug.callstack
        self.breakpoints: dict[str, set[int]] = {}  # file_path -> set of line numbers

    def format_path(self, path: str) -> str:
        return path.format(workspace=self.base.active_directory)

    def launch_standalone(self, editor: TextEditor) -> None:
        """Launch the debugger in standalone mode.

        Args:
            editor (TextEditor): the text editor"""

        self._launch_debugger(editor.path)

    def _launch_debugger(self, path: str) -> None:
        """Launch the debugger.

        Args:
            path (str): the file path"""

        self.manager.latest = self
        self.launch(path)

    def launch_config(self, config: dict[str, str]) -> None:
        """Launch the debugger with the given configuration.

        Args:
            config (dict[str, str]): the configuration"""

        self.manager.latest = self
        self.launch(
            self.format_path(config["program"]),
            self.format_path(config.get("cwd", "")),
        )

    def launch(self, path: str, cwd: str = None) -> None:
        """Debug the file.

        This method should be implemented by the subclass.

        Args:
            path (str): the file path
            cwd (str): the working directory"""

        raise NotImplementedError

    def update_breakpoints(self, file_path: str, line_numbers: set[int]) -> None:
        """Update the breakpoints for the file.

        Args:
            file_path (str): the file path
            line_numbers (set[int]): the set of line numbers"""

        self.breakpoints[file_path] = line_numbers

    def stop(self):
        """Stop the debugger."""

        raise NotImplementedError

    def restart(self):
        """Restart the debugger."""

        raise NotImplementedError

    def step_in(self) -> None:
        """Step through the code."""

        raise NotImplementedError

    def step_over(self) -> None:
        """Step over the code."""

        raise NotImplementedError

    def step_out(self) -> None:
        """Step out of the code."""

        raise NotImplementedError

    def continue_pause(self) -> None:
        """Toggle between continue and pause."""

        raise NotImplementedError

    def set_variable(self, name: str, value: str) -> None:
        """Set the value of a local variable.

        Args:
            name (str): local variable name
            value (str): the value"""

        raise NotImplementedError
