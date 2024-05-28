from __future__ import annotations

import typing

from src.biscuit.api.releases import Releases

if typing.TYPE_CHECKING:
    from src.biscuit import App

__all__ = ["ExtensionsAPI"]

from src.biscuit.api.editors import Editors
from src.biscuit.components import BaseEditor, BaseGame
from src.biscuit.components.editors import Languages
from src.biscuit.components.floating.palette.actionset import ActionSet
from src.biscuit.layout.statusbar import SButton

from .commands import Commands
from .logger import Logger
from .notifications import Notifications
from .utils import Utils
from .views import Views


class ExtensionsAPI:
    def __init__(self, base: App) -> None:
        self.base = base

        self.menubar = self.base.menubar
        self.statusbar = self.base.statusbar
        self.sidebar = self.base.sidebar
        self.panel = self.base.panel
        self.sysinfo = self.base.sysinfo
        self.editorsmanager = self.base.editorsmanager
        self.terminalmanager = self.base.terminalmanager
        self.languageservermanager = self.base.language_server_manager

        self.commands = Commands(self.base)
        self.logger = Logger(self.base)
        self.editors = Editors(self.base)
        self.notifications = Notifications(self.base)
        self.utils = Utils(self.base)
        self.views = Views(self.base)

        self.releases = Releases(self.base)

        self.Game = BaseGame
        self.Editor = BaseEditor

        self.SButton = SButton
        self.ActionSet = ActionSet

        # Enum of supported languages
        self.LANGUAGES = Languages
        self.register_comment_prefix = self.base.register_comment_prefix
        self.register_game = self.base.register_game
        self.register_langserver = self.base.register_langserver
        self.register_run_command = self.base.register_run_command
