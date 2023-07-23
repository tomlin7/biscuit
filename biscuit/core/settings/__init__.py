import os
import tkinter as tk
import tkextrafont as extra

from .config import Config, Bindings
from .res import Resources
from .styles import Style

from biscuit.core.components.games import get_games
from .editor import SettingsEditor


class Settings:
    def __init__(self, base):
        self.base = base

        self.config = Config(self)
        self.style = Style(self.base, self.config.theme)
        self.res = Resources(self)
        self.bindings = Bindings(self)

        self.commands = [
            ("Open settings", self.base.open_settings),
        ]
        
        self.setup_font()
        self.gen_actionset()
    
    def register_command(self, name, command):
        """
        Registers a new command to the action set.

        Args:
            name (str): The name of the command.
            command (function): The function to be executed when the command is triggered.
        """
        self.commands.append((name, command))
        self.gen_actionset()

    def gen_actionset(self):
        """
        Generates the action set with predefined commands and registered commands.
        """
        from biscuit.core.components import ActionSet
        self._actionset = ActionSet(
            "Show and run commands", ">",
            [
                ("Open settings", self.base.open_settings),
            ] + self.commands + get_games(self.base)
        )

    def setup_font(self):
        self.iconfont = extra.Font(file=self.res.get_res_path("codicon.ttf"), family="codicon")
        self.font = tk.font.Font(
            family=self.config.font[0],
            size=self.config.font[1]
        )

    @property
    def actionset(self):
        """
        Returns the generated action set.
        """
        return self._actionset
