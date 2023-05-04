import os
import tkinter as tk
import tkinter.font as Font
import tkextrafont as extra

from .. import config
from core.components import ActionSet


class Settings:
    def __init__(self, base):
        self.base = base

        self.config = config.Config(self)
        self.setup_properties()
        self.gen_actionset()
    
    def gen_actionset(self):
        self.actionset = ActionSet(
            "Show and run commands", ">",
            [
                ("Editor Theme", lambda e=None: print("Theme", e)),
                ("Editor Bindings", lambda e=None: print("Bindings", e)),
                ("Editor Font", lambda e=None: print("Font", e)),
                ("Play tetris", self.base.open_tetris)
            ],
        )

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
            size=self.config.font.size)
        
        # iconfont
        self.iconfont = extra.Font(file=os.path.join(self.base.appdir, "res/codicon/codicon.ttf"), family="codicon")
        
