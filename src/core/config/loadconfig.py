import json
import os


class ConfigLoader:
    """
    Loads configurations for biscuit from json file.
    """
    def __init__(self, master, config_file="settings.json"):
        self.base = master.base

        self.config_file = config_file
        self.config = self.load_config()

    def load_config(self):
        with open(self.base.get_config_path(self.config_file), 'r') as settingsfile:
            config = json.load(settingsfile)
        return config

    def get_config(self):
        return self.config
