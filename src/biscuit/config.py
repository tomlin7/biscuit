import os
import sys
from pathlib import Path

from .api import ExtensionsAPI
from .binder import Binder
from .commands import Commands
from .common import GameManager, SysInfo
from .execution import ExecutionManager
from .extensions import ExtensionManager
from .git import Git
from .history import HistoryManager
from .language import LanguageServerManager
from .settings import Settings


class ConfigManager:
    """
    CONFIG MANAGER
    --------------

    Configuration manager part of Biscuit Core.
    Manages the application state, configurations, settings, and extensions.
    """

    # application state / environement
    initialized: bool
    testing: bool

    # active directory dependant
    git_found: bool
    active_directory: str
    active_branch_name: str

    # constants
    resdir: str
    appdir: str
    extensionsdir: str
    git_found = False
    wrap_words = False
    tab_spaces = 4
    block_cursor = False
    active_directory = None
    active_branch_name = None
    onupdate_callbacks = []
    onfocus_callbacks = []

    # runtime flags
    testing = False
    frozen = False

    def setup_configs(self) -> None:
        if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
            self.frozen = True

        if os.environ.get("ENVIRONMENT") == "test":
            self.testing = True

        self.system = SysInfo(self)
        self.settings = Settings(self)
        self.history = HistoryManager(self)

        self.config = self.settings.config
        self.theme = self.config.theme

        self.commands = Commands(self)
        self.binder = Binder(self)
        self.git = Git(self)
        self.game_manager = GameManager(self)
        self.language_server_manager = LanguageServerManager(self)
        self.execution_manager = ExecutionManager(self)

    def setup_path(self, appdir: str) -> None:
        """Sets up the application paths and directories."""

        # sets up the application directory
        self.appdir = os.path.dirname(appdir)
        sys.path.append(self.appdir)

        # resources, config, extensions are outside src/
        self.parentdir = self.appdir
        if not self.frozen:
            self.parentdir = Path(self.appdir).parent.absolute()

        self.resdir = os.path.join(
            getattr(sys, "_MEIPASS", self.parentdir), "resources"
        )
        self.configdir = os.path.join(self.parentdir, "config")
        self.extensionsdir = os.path.join(self.parentdir, "extensions")
        self.datadir = os.path.join(self.parentdir, "data")

        try:
            os.makedirs(self.datadir, exist_ok=True)
        except Exception as e:
            print(f"Data directory invalid: {e}")

        try:
            # creates the extensions directory next to executable
            os.makedirs(self.extensionsdir, exist_ok=True)
        except Exception as e:
            print(f"Extensions failed: {e}")

    def setup_extensions(self):
        # sets up the extension API & loads extensions
        self.api = ExtensionsAPI(self)
        self.extensions_manager = ExtensionManager(self)
        self.extensions_view.results.late_setup()
        self.extensions_view.initialize()

    def set_tab_spaces(self, spaces: int) -> None:
        self.tab_spaces = spaces
        if e := self.editorsmanager.active_editor:
            if e.content and e.content.editable:
                e.content.text.set_tab_size(spaces)
                self.statusbar.set_spaces(spaces)
