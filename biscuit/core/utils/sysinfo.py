from __future__ import annotations

import typing

if typing.TYPE_CHECKING:
    from ... import App

import platform
import sys
from dataclasses import dataclass


@dataclass
class SysInfo:
    def __init__(self, base: App) -> None:
        self.base = base
        
        self.os = platform.system()
        self.version = platform.version()
        self.release = platform.release()
        self.machine = platform.machine()
        self.processor = platform.processor()
        self.python_version = sys.version

    def __str__(self) -> None:
        return f"""
        OS: {self.os} ({self.version}, {self.release})
        Machine: {self.machine}
        Processor: {self.processor}
        Python Version: {self.python_version}
        """
