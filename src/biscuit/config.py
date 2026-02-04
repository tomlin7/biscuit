from __future__ import annotations

import os
import sys
import typing
import tkinter as tk
from pathlib import Path

from biscuit.layout.statusbar.statusbar import Statusbar

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

if typing.TYPE_CHECKING:
    from biscuit.layout.editors.manager import EditorsManager
    from biscuit.views.extensions.extensions import Extensions



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
    appdir: str
    configdir: Path
    datadir: Path
    extensiondir: Path
    userdir: Path
    fallback_extensiondir: Path
    resdir: Path
    fallback_resdir: Path
    second_fallback_resdir: Path

    # for type hinting
    extensions_view: Extensions
    editorsmanager: EditorsManager
    statusbar: Statusbar

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
            self.parentdir = Path(self.appdir)
        else:
            self.appdir = os.path.dirname(os.path.abspath(__file__))
            self.parentdir = Path(self.appdir).parent.parent.absolute()

        self.userdir = u = Path.home() / ".biscuit"

        self.configdir = u / "config"
        self.extensiondir = u / "extensions"
        self.datadir = u / "data"

        self.fallback_extensiondir = self.parentdir / "extensions"

        self.resdir = self.parentdir / "resources"
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
    
    def refresh_editors(self) -> None:
        self.tab_spaces = self.config.tab_size
        self.wrap_words = self.config.word_wrap
        self.block_cursor = self.config.cursor_style == "block"
        self.relative_line_numbers = self.config.relative_line_numbers
        self.show_minimap = self.config.show_minimap
        self.show_linenumbers = self.config.show_linenumbers
        self.theme = self.config.theme

        for editor in self.editorsmanager.active_editors:
            if editor.content and editor.content.editable:
                editor.content.text.configure(
                    tabs=(self.settings.font.measure(" " * self.tab_spaces),),
                    blockcursor=self.block_cursor,
                    wrap=tk.WORD if self.wrap_words else tk.NONE,
                    **self.theme.editors.text
                )
                editor.content.text.relative_line_numbers = self.relative_line_numbers
                editor.content.linenumbers.redraw()
                
                if self.show_minimap:
                    editor.content.minimap.grid()
                else:
                    editor.content.minimap.grid_remove()
                    
                if self.show_linenumbers:
                    editor.content.linenumbers.grid()
                else:
                    editor.content.linenumbers.grid_remove()
                
    @property
    def active_workspace(self):
        return self.workspaces.workspace
