from __future__ import annotations

import typing

if typing.TYPE_CHECKING:
    from biscuit.editor.text import TextEditor

from .base import Debugger
from .python_bdb import PythonDebugger


def get_debugger(editor: TextEditor) -> Debugger:
    """Get the debugger for the given editor.

    Args:
        editor (TextEditor): The editor instance

    Returns:
        Debugger: The debugger instance
    """

    if editor.text.language == "Python":
        return PythonDebugger(editor)

    # others are not supported yet
