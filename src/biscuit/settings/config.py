import os
import sqlite3
import toml

from .theme.catppuccin_mocha import CatppuccinMocha
from .theme.gruvbox_dark import GruvboxDark

# from .theme import Dark, Light, Theme


class Config:
    """Loads and manages configurations for biscuit."""

    def __init__(self, master) -> None:
        self.base = master.base

        self.theme = GruvboxDark()
        self.font = ("Fira Code", 12)
        self.uifont = ("Fira Code", 10)

        self.auto_save_enabled = False
        self.auto_save_timer_ms = 10000

        self.db_path = os.path.join(self.base.datadir, "settings.db")
        self.db = sqlite3.connect(self.db_path)
        self.cursor = self.db.cursor()

        self.cursor.executescript(
            """
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY NOT NULL,
                value TEXT
            );
            """
        )

    def get_config_path(self, relative_path: str) -> str:
        """Get the absolute path to the resource

        Args:
            relative_path (str): path relative to the config directory"""

        return os.path.join(self.base.configdir, relative_path)

    def load_config(self) -> dict:
        with open(self.get_config_path("settings.toml"), "r") as settingsfile:
            config = toml.load(settingsfile)

        return config

    def load_data(self) -> None:
        self.cursor.execute("SELECT value FROM settings WHERE key='theme'")
        theme = self.cursor.fetchone()
        if theme:
            self.theme = theme[0]

        self.cursor.execute("SELECT value FROM settings WHERE key='font'")
        font = self.cursor.fetchone()
        if font:
            self.font = font[0]

        self.cursor.execute("SELECT value FROM settings WHERE key='uifont'")
        uifont = self.cursor.fetchone()
        if uifont:
            self.uifont = uifont[0]

        self.cursor.execute("SELECT value FROM settings WHERE key='auto_save_enabled'")
        auto_save_enabled = self.cursor.fetchone()
        if auto_save_enabled:
            self.auto_save_enabled = auto_save_enabled[0]

        self.cursor.execute("SELECT value FROM settings WHERE key='auto_save_timer_ms'")
        auto_save_timer_ms = self.cursor.fetchone()
        if auto_save_timer_ms:
            self.auto_save_timer_ms = auto_save_timer_ms[0]

    def save_data(self) -> None:
        self.cursor.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('theme', ?)",
            (self.theme,),
        )
        self.cursor.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('font', ?)",
            (self.font,),
        )
        self.cursor.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('uifont', ?)",
            (self.uifont,),
        )
        self.cursor.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('auto_save_enabled', ?)",
            (self.auto_save_enabled,),
        )
        self.cursor.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('auto_save_timer_ms', ?)",
            (self.auto_save_timer_ms,),
        )
        self.db.commit()
