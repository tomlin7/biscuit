import os, toml, sys
from .bindings import Bindings
from .theme import Light, Dark
from dataclasses import dataclass


class Config:
    """
    Loads and manages configurations for biscuit.
    """
    def __init__(self, master):
        self.base = master.base
        
        self.theme=Dark()
        self.font=("Consolas", 13)
        self.ui_font = ("Segoi UI", 10)

        # TODO loading config from user settings
        # self.config = self.load_config()
        # self.load_data()
    
    def get_config_path(self, relative_path):
        """Get the absolute path to the resource"""
        return os.path.join(self.base.configdir, relative_path)

    def load_config(self):
        with open(self.get_config_path("settings.toml"), 'r') as settingsfile:
            config = toml.load(settingsfile)
            
        return config

    def load_data(self):
        #TODO testing 
        self.theme = Dark()
        self.font = (self.config['font'], self.config['font_size'])
