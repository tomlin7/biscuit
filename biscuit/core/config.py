
import os
import sys

from .api import *
from .binder import Binder
from .commands import Commands
from .components import *
from .exec import ExecManager
from .extensions import ExtensionManager
from .history import HistoryManager
from .settings import *
from .utils import *


class ConfigManager:
    """
    CONFIG MANAGER
    --------------
    
    Configuration manager part of Biscuit Core
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

    def setup_configs(self) -> None:
        self.git_found = False
        self.wrap_words = False
        self.tab_spaces = 4
        self.block_cursor = False
        self.active_directory = None
        self.active_branch_name = None
        self.onupdate_callbacks = []
        self.onfocus_callbacks = []

        self.testing = False
        if os.environ.get('ENVIRONMENT') == 'test':
            self.testing = True

        self.sysinfo = SysInfo(self)
        self.settings = Settings(self)
        self.history = HistoryManager(self)

        self.config = self.settings.config
        self.theme = self.config.theme

        self.commands = Commands(self)
        self.binder = Binder(self)
        self.git = Git(self)
        self.language_server_manager = LanguageServerManager(self)
        self.exec_manager = ExecManager(self)

    def setup_path(self, appdir: str) -> None:
        # setup all paths used across editor
        self.appdir = os.path.dirname(appdir)
        sys.path.append(self.appdir)

        self.resdir = os.path.join(getattr(sys, "_MEIPASS", os.path.dirname(appdir)), "res")
        self.configdir = os.path.join(self.appdir, "config")
        self.extensionsdir = os.path.join(self.appdir, "extensions")
        self.datadir = os.path.join(self.appdir, "data")
        
        try:
            os.makedirs(self.datadir, exist_ok=True)
        except Exception as e:
            print(f"Data directory invalid: {e}")

        try:
            # creates the extensions directory next to executable
            os.makedirs(self.extensionsdir, exist_ok=True)
        except Exception as e:
            print(f"Extensions failed: {e}")

    def setup_api(self):
        # sets up the extension API & loads extensions
        self.api = ExtensionsAPI(self)
        self.extensions_manager = ExtensionManager(self)
    
    def set_tab_spaces(self, spaces: int) -> None:
        self.tab_spaces = spaces
        if e := self.editorsmanager.active_editor:
            if e.content and e.content.editable:
                e.content.text.set_tab_size(spaces)
                self.statusbar.set_spaces(spaces)
