from __future__ import annotations

import typing

from .commands import Commands
from .editors import Editors
from .logger import Logger
from .notifications import Notifications
from .releases import Releases
from .utils import Utils
from .views import Views

if typing.TYPE_CHECKING:
    from src.biscuit import App


class ExtensionsAPI:
    """Extensions API

    This class is used to interact with the Biscuit API.
    The API provides access to the `base` (App) instance which means
    the extension can interact with every part of the application without
    any restrictions.

    Furthermore, the API provides access to the following endpoints for easier access:
    - `commands`
    - `logger`
    - `editors`
    - `notifications`
    - `utils`
    - `views`
    - `releases`

    REGISTER METHODS:
    - `register_comment_prefix` - Register a comment prefix for a language
    - `register_game` - Register a game
    - `register_langserver` - Register a language server
    - `register_run_command` - Register a run command
    """

    def __init__(self, base: App) -> None:
        self.base = base

        self.menubar = self.base.menubar
        self.statusbar = self.base.statusbar
        self.sidebar = self.base.drawer
        self.panel = self.base.panel
        self.sysinfo = self.base.system
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

        from src.biscuit.common import ActionSet, BaseGame
        from src.biscuit.editor import BaseEditor
        from src.biscuit.language import Languages
        from src.biscuit.layout.statusbar import SButton

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
