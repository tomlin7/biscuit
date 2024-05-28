from __future__ import annotations

import platform
import sys
import tkinter as tk
import typing
from dataclasses import dataclass
from textwrap import dedent

import psutil

if typing.TYPE_CHECKING:
    from .. import App

from src import __version__


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
        self.tk_version = tk.TclVersion

    @property
    def is_windows(self) -> bool:
        return self.os == "Windows"
    
    @property
    def is_linux(self) -> bool:
        return self.os == "Linux"
    
    @property
    def is_macos(self) -> bool:
        return self.os == "Darwin"
    
    def get_current_stats(self) -> str: 
        """Get current CPU and Memory usage"""

        cpu_percent = psutil.cpu_percent(interval=0)
        memory_percent = psutil.virtual_memory().percent
        # memory = psutil.virtual_memory()
        # total_memory_gb = round(memory.total / (1024**3), 2)
        # used_memory_gb = round((memory.total - memory.available) / (1024**3), 2)
        return f"CPU: {cpu_percent}% | Mem: {memory_percent}%"

    def __str__(self) -> None:
        # ikr this is a mess
        return dedent(
    f"""BISCUIT
----------------------------------------

"Life is short, eat more biscuits." 
    - billiam (2020, colorized, not really)

----------------------------------------

Version: {__version__}
Python Version: {self.python_version}
Tcl/Tk Version: {self.tk_version}
OS: {self.os} {self.release} ({self.version})
Processor: {self.processor}

MIT License
Copyright (c) 2021-24 tomlin7""")
