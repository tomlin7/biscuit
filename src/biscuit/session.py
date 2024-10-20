import os
import sqlite3


class SessionManager:
    def __init__(self, base_dir):
        # Initialize the session database connection
        self.base_dir = base_dir
        self.session_db_path = os.path.join(self.base_dir, "session.db")
        self.db = sqlite3.connect(self.session_db_path)
        self.cursor = self.db.cursor()

        # Ensure the session table is created
        self._create_session_table()

    def _create_session_table(self):
        """Create the session table if it doesn't exist."""
        self.cursor.executescript(
            """
            CREATE TABLE IF NOT EXISTS session (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_path TEXT,
                folder_path TEXT
            );
            """
        )

    def clear_session(self):
        """Clear the session table."""
        self.cursor.execute("DELETE FROM session")

    def save_session(self, opened_files, active_directory):
        """Save the currently opened files and directories into the session."""
        for file_path in opened_files:
            self.cursor.execute("INSERT INTO session (file_path) VALUES (?)", (file_path,))

        self.cursor.execute("INSERT INTO session (folder_path) VALUES (?)", (active_directory,))


        self.db.commit()

    def close(self):
        """Close the database connection."""
        self.db.close()