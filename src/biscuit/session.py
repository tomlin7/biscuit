# Credits: RINO-GAELICO

from __future__ import annotations

import sqlite3 as sq
import typing

if typing.TYPE_CHECKING:
    from biscuit import App


class SessionManager:
    def __init__(self, base: App):
        self.base = base

        # Initialize the session database connection
        self.base_dir = self.base.datadir
        self.session_db_path = self.base.datadir / "session.db"
        self.db = sq.connect(self.session_db_path)
        self.cursor = self.db.cursor()

        # Ensure the session table is created
        self._create_session_table()

    def _create_session_table(self):
        self.cursor.executescript(
            """
            CREATE TABLE IF NOT EXISTS session (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_path TEXT,
                folder_path TEXT
            );
            """
        )

    def restore_session(self):
        opened_files = []
        active_directory = ""

        self.cursor.execute("SELECT * FROM session")
        for row in self.cursor.fetchall():
            if row[1]:
                opened_files.append(row[1])
            elif row[2]:
                active_directory = row[2]

        self.base.open_directory(active_directory)
        self.base.open_files(opened_files)

    def clear_session(self):
        self.cursor.execute("DELETE FROM session")

    def save_session(self, opened_files, active_directory):
        for file_path in opened_files:
            self.cursor.execute(
                "INSERT INTO session (file_path) VALUES (?)", (file_path,)
            )

        self.cursor.execute(
            "INSERT INTO session (folder_path) VALUES (?)", (active_directory,)
        )

        self.db.commit()

    def close(self):
        self.db.close()
