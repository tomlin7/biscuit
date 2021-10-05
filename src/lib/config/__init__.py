import json

from lib.config.bindings import Bindings
from lib.config.theme import Theme


class Config:
    theme: str
    font: dict

    # "theme": "default",
    # "font": {
    #     "family": "Consolas", 
    #     "size": 16,
    #     "style": "normal"
    # }

    
    def __init__(self):
        self.config = None

    def load_data(self):
        with open('config/settings.json') as settingsfile:
            self.config = json.load(settingsfile)
        self.assign_data()
    
    def assign_data(self):
        self.theme = self.config['theme']
        self.font = self.config['font']
