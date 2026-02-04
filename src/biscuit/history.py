from __future__ import annotations

import os
import toml
import typing
from .common import ActionSet, FixedSizeStack

if typing.TYPE_CHECKING:
    from . import App

class HistoryManager:
    """Manages the history of opened files and folders.

    Manages the history of opened files and folders.
    Uses a TOML file to store the history.
    """

    def __init__(self, base: App) -> None:
        self.base = base
        self.path = self.base.datadir / "history.toml"
        self.history = {}

        if self.path.exists():
            try:
                self.history = toml.load(self.path)
            except Exception as e:
                self.base.logger.error(f"History load failed: {e}")
                self.history = {}

        self.file_history = FixedSizeStack(self, "file_history").load(self.history.get("file_history", []))
        self.folder_history = FixedSizeStack(self, "folder_history").load(self.history.get("folder_history", []))

    def generate_actionsets(self) -> None:
        self.base.palette.register_actionset(
            lambda: ActionSet("Recent files", "recentf:", self.file_history.list)
        )
        self.base.palette.register_actionset(
            lambda: ActionSet("Recent folders", "recentd:", self.folder_history.list)
        )

    def register_file_history(self, path: str) -> None:
        self.file_history.push(path)

    def register_folder_history(self, path: str) -> None:
        self.folder_history.push(path)

    def dump(self) -> None:
        try:
            with open(self.path, 'w') as f:
                toml.dump({
                    "file_history": self.file_history.dump(),
                    "folder_history": self.folder_history.dump(),
                }, f)
        except Exception as e:
            self.base.logger.error(f"History save failed: {e}")

    def clear_history(self) -> None:
        self.file_history.clear()
        self.folder_history.clear()
