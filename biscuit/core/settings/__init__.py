"""Settings
Loads and manages the editor configurations and provides settings editor GUI
"""
from __future__ import annotations

__all__ = ["Settings", "SettingsEditor"]

import re
import tkinter as tk
import tkinter.font as tkfont
import typing

import tkextrafont as extra

from biscuit.core.components.games import get_games
from biscuit.core.utils.classdrill import extract_commands, formalize_command

from ..commands import Commands
from .config import Bindings, Config
from .editor import SettingsEditor
from .res import Resources
from .styles import Style

if typing.TYPE_CHECKING:
    from ... import App


URL = re.compile(r'^(?:http)s?://')

class Formattable(str):
    def format(self, term) -> str:
        default = 'https://github.com/'
        if not term or URL.match(term):
            return super().format(term)

        return super().format(f'{default}{term}')

class Settings:
    def __init__(self, base: App) -> None:
        self.base = base

        self.config = Config(self)
        self.style = Style(self.base, self.config.theme)
        self.res = Resources(self)
        self.bindings = Bindings(self)

        self.commands = []

        self.setup_font()

    def register_command(self, command: str, callback: typing.Callable) -> None:
        """
        Registers a new command to the action set.

        Parameters
        ----------
        command: 
            The name of the command.
        callback: 
            The function to be executed when the command is triggered.
        """
        self.commands.append((command, callback))
        self.gen_actionset()

    def gen_actionset(self) -> None:
        """Generates the action set with predefined commands and registered commands."""
        from biscuit.core.components import ActionSet
        self._actionset = ActionSet(
            "Show and run commands", ">", self.commands + get_games(self.base)
        )

    def setup_font(self) -> None:
        try:
            self.iconfont = extra.Font(file=self.res.get_res_path("codicon.ttf"), family="codicon")
        except tk.TclError:
            pass

        self.font = tkfont.Font(
            family=self.config.font[0],
            size=self.config.font[1]
        )
        self.font_bold = tkfont.Font(
            family=self.config.font[0],
            size=self.config.font[1],
            weight="bold"
        )
        self.autocomplete_font = tkfont.Font(
            family=self.config.font[0],
            size=self.config.font[1] - 1
        )
        self.uifont = tkfont.Font(
            family=self.config.uifont[0],
            size=self.config.uifont[1]
        )

    def late_setup(self) -> None:
        """Configurations that require full initialization of editor"""

        self.commands = [(formalize_command(name), lambda _, method=method: method(self.base.commands)) 
                for name, method in extract_commands(self.base.commands)]
        
        self.gen_actionset()
        self.base.palette.register_actionset(lambda: self.actionset)

        from biscuit.core.components import ActionSet
        clone_actionset = ActionSet(
            "Clone git repository", "clone", pinned=[[Formattable("clone {}"), self.base.clone_repo]]
        )
        self.base.palette.register_actionset(lambda: clone_actionset)

        self.symbols_actionset = ActionSet(
            "Go to symbol in editor", "@", []
        )
        self.base.palette.register_actionset(lambda: self.symbols_actionset)
    
    @property
    def actionset(self):
        """Returns the generated action set."""
        return self._actionset
