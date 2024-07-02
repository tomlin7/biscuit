from __future__ import annotations

import importlib.resources as resources
import os
import sys
import tkinter as tk
import typing
from contextlib import ExitStack
from importlib.resources import as_file, files

if typing.TYPE_CHECKING:
    from .. import App


class Resources:
    """Loads and manages resources for biscuit."""

    def __init__(self, master) -> None:
        self.base: App = master.base
        self.exit_stack = ExitStack()
        self.load_data()

    def load_data(self) -> None:
        self.logo = self.load_image("logo.png")
        self.stipple = self.get_res_path("bitmap/stipple.xbm")
        self.indent_guide = self.get_res_path("bitmap/indentguide.xbm")
        self.line = self.get_res_path("bitmap/line.xbm")

    def get_res_path(self, relative_path: str) -> str:
        if self.base.frozen:
            # PyInstaller creates a temp folder and stores path in _MEIPASS
            return os.path.join(self.base.resdir, relative_path)
        else:
            # Running from source / package
            try:
                path = self.exit_stack.enter_context(
                    as_file(files("resources").joinpath(relative_path))
                )
                return str(path)
            except:
                # Fallback to the old method if resource not found
                return self._fallback_get_res_path(relative_path)

    def _fallback_get_res_path(self, relative_path: str) -> str:
        paths = [
            os.path.join(self.base.resdir, relative_path),
            os.path.join(self.base.fallback_resdir, relative_path),
            os.path.join(self.base.second_fallback_resdir, relative_path),
        ]
        for path in paths:
            if os.path.exists(path):
                return path

        raise FileNotFoundError(f"Resource not found: {relative_path}")

    def get_res_path_platform(self, relative_path: str) -> str:
        platform = "win32" if self.base.system.is_windows else "linux"
        return self.get_res_path(os.path.join(platform, relative_path))

    def get_font(self, path: str) -> str:
        return self.get_res_path(os.path.join("fonts", path))

    def load_image(self, path: str) -> tk.PhotoImage:
        return tk.PhotoImage(file=self.get_res_path(path))

    def __del__(self):
        self.exit_stack.close()
