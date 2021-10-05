import tkinter as tk
import tkinter.font as Font

import lib.config as config

class Settings:
    font: Font
    theme: config.Theme
    
    config: config.Config

    def __init__(self):
        self.config = config.Config()
        self.setup_properties()

    def setup_properties(self):
        self.setup_theme()
        self.setup_font()

    def setup_theme(self):
        # self.theme = config.Theme()
        pass

    def setup_font(self):
        self.font = tk.font.Font(
            family=self.config.font.family, 
            size=self.config.font.size, 
            weight=self.config.font.style)
        