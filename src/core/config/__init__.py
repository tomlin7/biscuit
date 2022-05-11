import json

from .font import Font
from .bindings import Bindings
from .theme import Theme
from .loadconfig import ConfigLoader


class Config:
    """
    Loads and manages configurations for biscuit.
    """

    theme: str
    font: Font

    # TODO: more properties
    # ...

    def __init__(self, master):
        self.base = master.base

        self.loader = ConfigLoader(self)
        self.config = self.loader.get_config()

        self.load_data()

    def load_data(self):
        self.theme = self.config['theme']
        font = self.config['font']
        self.font = Font(font['family'], font['size'], font['style'])
