import os
import tkinter as tk
import tkextrafont as extra

from .config import Config, Bindings
from .res import Resources
from .styles import Style
from .editor import SettingsEditor


class Settings:
    def __init__(self, base):
        self.base = base

        self.config = Config(self)
        self.style = Style(self.base, self.config.theme)
        self.res = Resources(self)

        self.commands = [
            ("Open settings", self.base.open_settings),
            ("Play tetris", self.base.open_tetris),
            ("Play game of life", self.base.open_gameoflife)
        ]
        
        self.setup_properties()
        self.gen_actionset()
    
    def gen_actionset(self):
        from core.components import ActionSet
        self.actionset = ActionSet(
            "Show and run commands", ">",
            [
                ("Editor Theme", lambda e=None: print("Theme", e)),
                ("Editor Bindings", lambda e=None: print("Bindings", e)),
                ("Editor Font", lambda e=None: print("Font", e)),
            ] + self.commands
        )

    def add_command(self, command, action):
        self.commands.append((command, action))

    def setup_properties(self):
        self.setup_bindings()
        self.setup_font()
    
    def setup_bindings(self):
        self.bindings = Bindings(self)

    def setup_font(self):
        self.font = tk.font.Font(
            family=self.config.font.family, 
            size=self.config.font.size)
        
        # iconfont
        self.iconfont = extra.Font(file=os.path.join(self.base.resdir, "codicon/codicon.ttf"), family="codicon")
        
