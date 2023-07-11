import os
import tkinter as tk
import tkextrafont as extra

from .config import Config, Bindings
from .res import Resources
from .styles import Style

from core.components.games import get_games
from .editor import SettingsEditor


class Settings:
    """
    The Settings class is responsible for managing the configuration settings of the application. 
    It initializes the Config, Style, and Resources classes, and sets up properties such as bindings and fonts. 
    It also generates an action set that allows the user to run commands and access various settings 
    related to the editor theme, bindings, and font.
    """
    def __init__(self, base):
        self.base = base

        self.config = Config(self)
        self.style = Style(self.base, self.config.theme)
        self.res = Resources(self)

        self.commands = [
            ("Open settings", self.base.open_settings),
        ]
        
        self.setup_properties()
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
        from core.components import ActionSet
        self._actionset = ActionSet(
            "Show and run commands", ">",
            [
                ("Editor Theme", lambda e=None: print("Theme", e)),
                ("Editor Bindings", lambda e=None: print("Bindings", e)),
                ("Editor Font", lambda e=None: print("Font", e)),
            ] + self.commands + get_games(self.base)
        )

    def setup_properties(self):
        """
        Sets up properties such as bindings and fonts.
        """
        self.setup_bindings()
        self.setup_font()

    def setup_bindings(self):
        """
        Sets up the Bindings class.
        """
        self.bindings = Bindings(self)

    def setup_font(self):
        """
        Sets up the font and icon fonts.
        """
        self.firacodefont = extra.Font(file=os.path.join(self.base.resdir, "fonts/firacode/firacode.ttf"), family="firacode")
        self.fixedsysfont = extra.Font(file=os.path.join(self.base.resdir, "fonts/fixedsys/FSEX302.ttf"), family="fixedsys")
        self.iconfont = extra.Font(file=os.path.join(self.base.resdir, "fonts/codicon/codicon.ttf"), family="codicon")
        self.font = tk.font.Font(
            family=self.config.font[0],
            size=self.config.font[1]
        )

    @property
    def actionset(self):
        """
        Returns the generated action set.

        Returns:
            ActionSet: The generated action set.
        """
        return self._actionset
