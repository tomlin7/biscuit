import os

import toml

from .theme.catppuccin_mocha import CatppuccinMocha
from .theme.gruvbox_dark import GruvboxDark

# from .theme import Dark, Light, Theme


class Config:
    """Loads and manages configurations for biscuit."""

    def __init__(self, master) -> None:
        self.base = master.base

        self.theme = GruvboxDark()
        self.font = ("Fira Code", 12)
        self.uifont = ("Fira Code", 10)

        self.auto_save_enabled = False
        self.auto_save_timer_ms = 10000

    def get_config_path(self, relative_path: str) -> str:
        """Get the absolute path to the resource

        Args:
            relative_path (str): path relative to the config directory"""

        return os.path.join(self.base.configdir, relative_path)

    def load_config(self) -> dict:
        with open(self.get_config_path("settings.toml"), "r") as settingsfile:
            config = toml.load(settingsfile)

        return config

    def load_data(self) -> None:
        # TODO testing
        self.theme = GruvboxDark()
        self.font = (self.config["font"], self.config["font_size"])
