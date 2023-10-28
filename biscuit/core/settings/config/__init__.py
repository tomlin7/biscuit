import os
import sys
from dataclasses import dataclass

import toml

from .bindings import Bindings
from .theme import Dark, Light


class Config:
    """Loads and manages configurations for biscuit."""
    def __init__(self, master) -> None:
        self.base = master.base

        self.theme=Dark()
        self.font=("Consolas", 13)
        self.uifont = ("Segoi UI", 10)

        self.auto_save_enabled = False
        self.auto_save_timer_ms = 10000

        # TODO loading config from user settings
        # self.config = self.load_config()
        # self.load_data()

    def get_config_path(self, relative_path: str) -> str:
        """Get the absolute path to the resource"""
        return os.path.join(self.base.configdir, relative_path)

    def load_config(self) -> dict:
        with open(self.get_config_path("settings.toml"), 'r') as settingsfile:
            config = toml.load(settingsfile)

        return config

    def load_data(self) -> None:
        #TODO testing 
        self.theme = Dark()
        self.font = (self.config['font'], self.config['font_size'])
