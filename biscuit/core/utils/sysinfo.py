from __future__ import annotations

import platform
import sys
import tkinter as tk
import typing
from dataclasses import dataclass
from textwrap import dedent

if typing.TYPE_CHECKING:
    from ... import App

from biscuit import __version__


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

    def __str__(self) -> None:
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
Copyright (c) 2021-24 billyeatcookies""")
