# Credits: RINO-GAELICO

from __future__ import annotations

import toml

class SessionManager:
    def __init__(self, base: App):
        self.base = base
        self.session_path = self.base.datadir / "session.toml"
        self.session = {}

        if self.session_path.exists():
            try:
                self.session = toml.load(self.session_path)
            except Exception as e:
                self.base.notifications.error(f"Failed to load session: {e}")
                self.session = {}

    def restore_session(self):
        if not self.session:
            return

        active_directory = self.session.get("active_directory")
        opened_files = self.session.get("opened_files", [])

        if active_directory:
            self.base.open_directory(active_directory)
        
        self.base.open_files(opened_files)

    def clear_session(self):
        self.session = {}
        if self.session_path.exists():
            try:
                # Create empty file or just empty dict
                with open(self.session_path, 'w') as f:
                    toml.dump({}, f)
            except Exception as e:
                self.base.logger.error(f"Failed to clear session: {e}")

    def save_session(self, opened_files, active_directory):
        self.session = {
            "active_directory": active_directory,
            "opened_files": opened_files
        }
        
        try:
            with open(self.session_path, 'w') as f:
                toml.dump(self.session, f)
        except Exception as e:
            self.base.logger.error(f"Failed to save session: {e}")

    def close(self):
        pass
