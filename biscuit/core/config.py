
import os
import sys
import importlib.util

from .api import *
from .components import *
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

    def get_user_integrated_preset_path(self):
        return os.path.join(os.path.expanduser("~"), ".biscuit", "preset.entry.py")

    def load_user_integrated_preset(self):
        path = self.get_user_integrated_preset_path()
        if os.path.exists(path):
            # user integrated preset exists
            spec = importlib.util.spec_from_file_location("user_integrated_preset", path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            self.user_integrated_preset = module
        else:
            self.user_integrated_preset = None

    def has_user_preset(self, path):
        t = self.user_integrated_preset
        ps = path.split('.')
        for s in ps:
            try:
                t = getattr(t, s)
            except:
                return False
        return True

    def get_user_preset(self, path):
        t = self.user_integrated_preset
        ps = path.split('.')
        for s in ps:
            try:
                t = getattr(t, s)
            except:
                return None
        return t

    def check_user_preset(self, path):
        return self.get_user_preset(path) in [True,"yes", "y"]

    def check_user_preset_neither(self, path, any_):
        return not (self.get_user_preset(path) in any_)

    def setup_configs(self) -> None:
        self.git_found = False
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

        self.events = Events(self)
        self.binder = Binder(self)
        self.git = Git(self)
        self.language_server_manager = LanguageServerManager(self)

        self.load_user_integrated_preset()

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
        
