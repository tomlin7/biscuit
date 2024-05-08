from __future__ import annotations

import os
import sqlite3
import typing

from ..sidebarview import SidebarView
from .chat import Chat
from .placeholder import AIPlaceholder

if typing.TYPE_CHECKING:
    ...

class AI(SidebarView):
    def __init__(self, master, *args, **kwargs) -> None:
        self.__buttons__ = [('refresh',), ('ellipsis',),]
        super().__init__(master, *args, **kwargs)
        self.__icon__ = 'sparkle-filled'
        self.name = 'AI'
        self.chat = None

        self.db = sqlite3.connect(os.path.join(self.base.datadir, "secrets.db"))
        self.cursor = self.db.cursor()
        self.cursor.executescript(
            """
            CREATE TABLE IF NOT EXISTS secrets (key TEXT NOT NULL, value TEXT);
            """
        )

        self.cursor.execute("SELECT value FROM secrets WHERE key='GEMINI_API_KEY'")
        self.api_key = self.cursor.fetchone()

        self.placeholder = AIPlaceholder(self)
        if self.api_key:
            self.add_chat(self.api_key[0])
        else:
            self.add_placeholder()
        
    def add_placeholder(self) -> None:
        self.add_widget(self.placeholder)
        if self.chat:
            self.remove_widget(self.chat)
            self.chat.destroy()

    def add_chat(self, api_key: str=None) -> None:
        self.api_key = api_key

        self.cursor.execute("INSERT OR REPLACE INTO secrets (key, value) VALUES ('GEMINI_API_KEY', ?)", (self.api_key,))
        self.db.commit()
        
        self.chat = Chat(self)
        self.add_widget(self.chat)
        self.remove_widget(self.placeholder)
