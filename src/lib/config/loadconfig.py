import json


class ConfigLoader:
    def __init__(self, config_file="settings.json"):
        self.config_file = config_file
        self.config = self.load_config()
 
    def load_config(self):
        with open(f'src/config/{self.config_file}') as settingsfile:
            config = json.load(settingsfile)
        return config

    def get_config(self):
        return self.config
