from __future__ import annotations

import typing

if typing.TYPE_CHECKING:
    from src.biscuit.components.editors import TextEditor

from .python_bdb import PythonDebugger


def get_debugger(editor: TextEditor):
    if editor.text.language == "Python":
        return PythonDebugger(editor)

    # others are not supported yet
