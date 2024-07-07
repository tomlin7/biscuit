from __future__ import annotations

import typing

from biscuit.common.actionset import ActionSet
from biscuit.language import Languages

from .base import DebuggerBase
from .config import ConfigLoader
from .python import PythonDebugger

if typing.TYPE_CHECKING:
    from biscuit import App
    from biscuit.editor.text import TextEditor


class DebuggerManager:
    """Debugger manager class.
    This class manages the debugger instances and provides methods to run them."""

    def __init__(self, base: App):
        self.base = base

        self.debuggers: dict[str, type[DebuggerBase]] = (
            {}
        )  # language -> debugger type mapping
        self.debuggers[Languages.PYTHON] = PythonDebugger

        self.spawned: dict[str, DebuggerBase] = (
            {}
        )  # language -> active debugger instance

        self._latest: DebuggerBase = None

        self.config_loader = ConfigLoader(self)

    def register_actionsets(self) -> None:
        """Register the debugger action sets."""

        set_local_actionset = ActionSet(
            "debugger: set local variable",
            "debugger.set_local",
            pinned=[
                ["Change value to {}", self.base.debug.variables.set_variable_callback]
            ],
        )
        self.base.register_actionset(lambda: set_local_actionset)

    @property
    def latest(self) -> DebuggerBase:
        """Get the latest debugger instance
        Returns:
            DebuggerBase: the latest debugger instance
        """
        return self._latest

    @latest.setter
    def latest(self, debugger: DebuggerBase) -> None:
        """Set the latest debugger instance
        Args:
            debugger (DebuggerBase): the debugger instance
        """
        self._latest = debugger

    def request_debugger_for_editor(self, editor: TextEditor) -> DebuggerBase:
        """Get or create a debugger instance for the given editor.
        Args:
            editor (TextEditor): the editor instance
        Returns:
            DebuggerBase: the debugger instance
        """
        return self.request_debugger(editor.language)

    def request_debugger(self, language: str) -> DebuggerBase:
        """Get or create a debugger instance for the given editor's language.
        Args:
            editor (TextEditor): the editor instance
        Returns:
            DebuggerBase: the debugger instance
        """
        if not (language and self.is_debugger_available(language)):
            return

        language = language.lower()
        if language not in self.spawned:
            debugger_type = self.debuggers.get(language)
            if not debugger_type:
                return

            self.spawned[language] = debugger_type(self)
        return self.spawned[language]

    def is_debugger_available_for_editor(self, editor: TextEditor) -> bool:
        """Check if a debugger is available for the given editor.
        Args:
            editor (TextEditor): the editor instance
        Returns:
            bool: True if a debugger is available, False otherwise
        """
        return self.is_debugger_available(editor.language)

    def is_debugger_available(self, language: str) -> bool:
        """Check if a debugger is available for the given editor's language.
        Args:
            editor (TextEditor): the editor instance
        Returns:
            bool: True if a debugger is available, False otherwise
        """
        return language.lower() in self.debuggers

    def register_debugger(self, language: str, debugger: type[DebuggerBase]) -> None:
        """Register a debugger for a specific language.
        Args:
            language (str): the language
            debugger (type[DebuggerBase]): the debugger type
        """
        self.debuggers[language] = debugger

    def unregister_debugger(self, language: str) -> None:
        """Unregister a debugger for a specific language.
        Args:
            language (str): the language
        """
        self.debuggers.pop(language, None)
