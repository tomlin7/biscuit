from __future__ import annotations

import typing

if typing.TYPE_CHECKING:
    from biscuit.core import App

__all__ = ["ExtensionsAPI"]

from biscuit.core.components import BaseEditor, BaseGame

from .commands import Commands
from .logger import Logger
from .notifications import Notifications
from .utils import Utils
from .views import Views


class ExtensionsAPI:
    def __init__(self, base: App) -> None:
        self.base = base

        self.commands = Commands(self.base)
        self.logger = Logger(self.base)
        self.notifications = Notifications(self.base)
        self.utils = Utils(self.base)
        self.views = Views(self.base)

        self.Game = BaseGame
        self.Editor = BaseEditor

        self.register_game = self.base.register_game
        self.register_langserver = self.base.register_langserver
