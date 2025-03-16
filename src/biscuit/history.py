from __future__ import annotations

import os
import sqlite3
import typing

from .common import ActionSet, FixedSizeStack

if typing.TYPE_CHECKING:
    from . import App


class HistoryManager:
    """Manages the history of opened files and folders.

    Manages the history of opened files and folders.
    Uses an sqlite3 database to store the history.
    """

    def __init__(self, base: App) -> None:
        self.base = base
        self.path = self.base.datadir / "history.db"

        self.db = sqlite3.connect(self.path)
        self.cursor = self.db.cursor()

        self.cursor.executescript(
            """
            CREATE TABLE IF NOT EXISTS file_history (path TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS folder_history (path TEXT NOT NULL);
            """
        )

        self.file_history = FixedSizeStack(self, "file_history").load_sqlite(
            self.cursor
        )
        self.folder_history = FixedSizeStack(self, "folder_history").load_sqlite(
            self.cursor
        )

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
        self.file_history.dump_sqlite(self.cursor)
        self.folder_history.dump_sqlite(self.cursor)
        self.db.commit()

    def clear_history(self) -> None:
        self.file_history.clear()
        self.folder_history.clear()
