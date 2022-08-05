import os
import tkinter as tk
import tkinter.font as Font
import tkextrafont as extra

from .. import config
from ..res import Resources


class Settings:
    def __init__(self, base):
        self.base = base

        self.config = config.Config(self)
        # self.resources = Resources(self)
        self.setup_properties()

    def setup_properties(self):
        self.setup_theme()
        self.setup_bindings()
        self.setup_font()
    
    def setup_theme(self):
        self.theme = config.Theme(self, self.config.theme)
    
    def setup_bindings(self):
        self.bindings = config.Bindings(self)

    def setup_font(self):
        self.font = tk.font.Font(
            family=self.config.font.family, 
            size=self.config.font.size, 
            weight=self.config.font.style)
        self.icon_font = extra.Font(file=os.path.join(self.base.appdir, "res/codicon/codicon.ttf"), family="codicon")
        
