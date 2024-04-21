from __future__ import annotations

import typing

if typing.TYPE_CHECKING:
    from biscuit.core.components.editors import TextEditor

from .output import DebuggerInfo
from .python_dbd import PythonDebugger


def get_debugger(editor: TextEditor):
    if editor.text.language == "Python":
        return PythonDebugger(editor)

    # others are not supported yet
