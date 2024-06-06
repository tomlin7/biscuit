from __future__ import annotations

import os
import tkinter as tk
import typing

if typing.TYPE_CHECKING:
    from .. import App


class Resources:
    """Loads and manages resources for biscuit."""

    def __init__(self, master) -> None:
        self.base: App = master.base
        self.load_data()

    def load_data(self) -> None:
        self.logo = self.load_image("logo.png")
        self.stipple = self.get_res_path("stipple.xbm")

    def get_res_path(self, relative_path: str) -> str:
        return os.path.join(self.base.resdir, relative_path)

    def get_res_path_platform(self, relative_path: str) -> str:
        if self.base.system.is_windows:
            return os.path.join(self.base.resdir, "win32", relative_path)
        return os.path.join(self.base.resdir, "linux", relative_path)

    def get_font(self, path: str) -> str:
        return self.get_res_path(os.path.join("fonts", path))

    def load_image(self, path: str) -> str:
        return tk.PhotoImage(file=self.get_res_path(path))
