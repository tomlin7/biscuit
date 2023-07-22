import os
from dataclasses import dataclass

import toml

from .bindings import Bindings
from .theme import Dark, Light


class Config:
    """
    Loads and manages configurations for biscuit.
    """
    def __init__(self, master):
        self.base = master.base
        self.config = self.load_config()
        self.load_data()

    def load_config(self):
        with open(os.path.join(self.base.configdir, "settings.toml"), 'r') as settingsfile:
            config = toml.load(settingsfile)
            
        return config

    def load_data(self):
        #TODO testing 
        self.theme = Dark()
        self.font = (self.config['font'], self.config['font_size'])
