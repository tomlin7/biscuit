from __future__ import annotations

import os
import sys
import typing

from .dap import DAPDebugger

if typing.TYPE_CHECKING:
    from .manager import DebuggerManager


class PythonDebugger(DAPDebugger):
    """Python debugger implementation using Debug Adapter Protocol (debugpy)."""

    def __init__(self, manager: DebuggerManager):
        super().__init__(manager)
        self.adapter_command = [sys.executable, "-m", "debugpy.adapter"]
