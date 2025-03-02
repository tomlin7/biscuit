from __future__ import annotations

import typing

from .assistant import Assistant
from .commands import Commands
from .editors import Editors
from .logger import Logger
from .notifications import Notifications
from .releases import Releases
from .views import Views

if typing.TYPE_CHECKING:
    from biscuit import App


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
        self.sidebar = self.base.sidebar
        self.panel = self.base.panel
        self.sysinfo = self.base.system
        self.editorsmanager = self.base.editorsmanager
        self.terminalmanager = self.base.terminalmanager
        self.languageservermanager = self.base.language_server_manager

        self.commands = Commands(self.base)
        self.logger = Logger(self.base)
        self.editors = Editors(self.base)
        self.notifications = Notifications(self.base)
        self.views = Views(self.base)
        self.releases = Releases(self.base)
        self.assistant = Assistant(self.base)

        self.register_comment_prefix = self.base.register_comment_prefix
        self.register_game = self.base.register_game
        self.register_langserver = self.base.register_langserver
        self.register_run_command = self.base.register_run_command

    def register(self, name: str, extension: object) -> None:
        """Register an extension"""

        self.base.extensions_manager.register_this_installed(name, extension)

    def register_extension(self, name: str, extension: object) -> None:
        """Register an extension"""

        self.register(name, extension)
