import os
import tkinter as tk


class Resources:
    """Loads and manages resources for biscuit."""

    def __init__(self, master) -> None:
        self.base = master.base
        self.load_data()

    def load_data(self) -> None:
        self.logo = self.load_image("logo.png")
        self.stipple = self.get_res_path("stipple.xbm")

    def get_res_path(self, relative_path: str) -> str:
        return os.path.join(self.base.resdir, relative_path)

    def load_image(self, path: str) -> str:
        return tk.PhotoImage(file=self.get_res_path(path))
