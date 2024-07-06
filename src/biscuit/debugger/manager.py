from __future__ import annotations

import typing

from biscuit.language import Languages

from .base import DebuggerBase
from .python_bdb import PythonDebugger

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

        self.active: dict[str, DebuggerBase] = (
            {}
        )  # language -> active debugger instance

    def request_debugger(self, editor: TextEditor) -> DebuggerBase:
        """Get or create a debugger instance for the given editor's language.
        Args:
            editor (TextEditor): the editor instance
        Returns:
            DebuggerBase: the debugger instance
        """
        if not (editor.language and self.is_debugger_available(editor)):
            return

        language = editor.language.lower()
        if language not in self.active:
            debugger_type = self.debuggers.get(language)
            if not debugger_type:
                return

            self.active[language] = debugger_type(self)
        return self.active[language]

    def is_debugger_available(self, editor: TextEditor) -> bool:
        """Check if a debugger is available for the given editor's language.
        Args:
            editor (TextEditor): the editor instance
        Returns:
            bool: True if a debugger is available, False otherwise
        """
        return editor.language.lower() in self.debuggers

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
