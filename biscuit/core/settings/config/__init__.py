from .bindings import Bindings
from .loader import ConfigLoader
from .theme import Light, Dark
from dataclasses import dataclass


@dataclass
class Font:
    family: str
    size: int


class Config:
    """
    Loads and manages configurations for biscuit.
    """
    def __init__(self, master):
        self.base = master.base

        self.loader = ConfigLoader(self)
        self.config = self.loader.get_config()

        self.load_data()

    def load_data(self):
        #testing 
        self.theme = Dark()
        font = self.config['font']
        self.font = Font(font, 15)
