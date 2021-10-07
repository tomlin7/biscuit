import json

from lib.config.font import Font
from lib.config.bindings import Bindings
from lib.config.theme import Theme
from lib.config.loadconfig import ConfigLoader

class Config:
    theme: str
    font: Font
    
    # TODO: more properties
    # ...
    
    def __init__(self):
        self.loader = ConfigLoader()
        self.config = self.loader.get_config()

        self.load_data()

    def load_data(self):
        self.theme = self.config['theme']
        font = self.config['font']
        self.font = Font(font['family'], font['size'], font['style'])
