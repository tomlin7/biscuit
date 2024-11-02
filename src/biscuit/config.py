import os
import sys
from pathlib import Path

from .api import ExtensionsAPI
from .binder import Binder
from .commands import Commands
from .common import GameManager, SysInfo
from .debugger import DebuggerManager
from .execution import ExecutionManager
from .extensions import ExtensionManager
from .git import Git
from .history import HistoryManager
from .language import LanguageServerManager
from .session import SessionManager
from .settings import Settings
from .workspaces import WorkspaceManager


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
    extensiondir: str
    git_found = False
    wrap_words = False
    tab_spaces = 4
    relative_line_numbers = False
    block_cursor = False
    active_directory = None
    active_branch_name = None
    onupdate_callbacks = []
    onfocus_callbacks = []

    # runtime flags
    testing = False
    frozen = False

    def setup_configs(self) -> None:
        self.frozen = getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS")
        self.testing = os.environ.get("ENVIRONMENT") == "test"

        self.system = SysInfo(self)
        self.settings = Settings(self)
        self.history = HistoryManager(self)
        self.sessions = SessionManager(self)
        self.workspaces = WorkspaceManager(self)

        self.resources = self.settings.resources
        self.bindings = self.settings.bindings
        self.config = self.settings.config
        self.theme = self.config.theme

        self.commands = Commands(self)
        self.binder = Binder(self)
        self.git = Git(self)
        self.game_manager = GameManager(self)
        self.language_server_manager = LanguageServerManager(self)
        self.execution_manager = ExecutionManager(self)
        self.debugger_manager = DebuggerManager(self)

    def setup_path(self, appdir: str) -> None:
        """Sets up the application paths and directories."""

        # sets up the application directory
        self.appdir = os.path.dirname(appdir)
        sys.path.append(self.appdir)

        # resources, config, extensions are outside src/
        if self.frozen:
            self.appdir = sys._MEIPASS
            self.parentdir = self.appdir
        else:
            self.appdir = os.path.dirname(os.path.abspath(__file__))
            self.parentdir = Path(self.appdir).parent.parent.absolute()

        self.configdir = os.path.join(self.parentdir, "config")

        self.extensiondir = Path.home() / ".biscuit" / "extensions"
        self.fallback_extensiondir = os.path.join(self.parentdir, "extensions")

        self.datadir = os.path.join(self.parentdir, "data")

        self.resdir = os.path.join(self.parentdir, "resources")
        self.fallback_resdir = Path(self.appdir).parent.absolute() / "resources"
        self.second_fallback_resdir = Path(self.appdir).absolute() / "resources"

        try:
            Path(self.datadir).mkdir(parents=True, exist_ok=True)
        except Exception as e:
            print(f"Data directory invalid: {e}")

        try:
            Path(self.extensiondir).mkdir(parents=True, exist_ok=True)
        except Exception as e:
            print(f"Extensions directory invalid: {e}")
            try:
                # fallback
                Path(self.fallback_extensiondir).mkdir(parents=True, exist_ok=True)
            except Exception as e:
                print(f"Extensions failed: {e}")

    def setup_extensions(self):
        # sets up the extension API & loads extensions
        self.api = ExtensionsAPI(self)
        self.extensions_manager = ExtensionManager(self)
        self.extensions_manager.start_server()
        self.extensions_view.results.late_setup()
        self.extensions_view.initialize()

    def set_tab_spaces(self, spaces: int) -> None:
        self.tab_spaces = spaces
        if e := self.editorsmanager.active_editor:
            if e.content and e.content.editable:
                e.content.text.set_tab_size(spaces)
                self.statusbar.set_spaces(spaces)

    @property
    def active_workspace(self):
        return self.workspaces.workspace
