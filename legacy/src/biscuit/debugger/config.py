from __future__ import annotations

import typing
from pathlib import Path

import toml

from .watcher import DebuggerConfigWatcher

if typing.TYPE_CHECKING:
    from .manager import DebuggerManager

CONFIG_FILE = "launch.toml"


class ConfigLoader:
    def __init__(self, manager: DebuggerManager):
        self.manager = manager
        self.base = manager.base
        self.config_found = False
        self.configs: list[dict] = []
        self.path: Path = None
        self.watcher = DebuggerConfigWatcher(self)

        self.base.bind("<<DirectoryChanged>>", self.check, add=True)

    def check(self, *_) -> None:
        self.config_found = False
        self.configs = []
        if not self.base.active_directory:
            self.watcher.stop_watch()
            self.refresh_debugger()
            return

        self.watcher.start_watch()

        self.path = Path(self.base.active_directory) / ".biscuit" / CONFIG_FILE
        if not self.path.exists():
            self.refresh_debugger()
            return

        self.config_found = True
        self.load(self.path)

    def refresh_debugger(self):
        self.base.debug.refresh()
        self.base.debug.refresh_configs()

    def load(self, path: Path) -> None:
        with open(path, "r") as f:
            data = toml.load(f)

        self.configs = data.values()
        self.base.debug.refresh_configs()
