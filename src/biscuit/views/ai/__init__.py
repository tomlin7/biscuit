from __future__ import annotations

import os
import sqlite3
import typing

from ..sidebarview import SidebarView
from .chat import Chat
from .menu import AIMenu
from .placeholder import AIPlaceholder

if typing.TYPE_CHECKING:
    ...

class AI(SidebarView):
    def __init__(self, master, *args, **kwargs) -> None:
        self.__buttons__ = [('refresh', self.new_chat),]
        super().__init__(master, *args, **kwargs)
        self.__icon__ = 'sparkle-filled'
        self.name = 'AI'
        self.chat = None

        self.menu = AIMenu(self)
        self.add_button('ellipsis', self.menu.show)
        self.menu.add_command("New Chat", self.new_chat)
        self.menu.add_command("Configure API Key...", self.add_placeholder)

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
            self.api_key = self.api_key[0]
            self.add_chat()
        else:
            self.add_placeholder()
        
    def add_placeholder(self) -> None:
        self.add_item(self.placeholder)
        if self.api_key:
            self.placeholder.api_key.set(self.api_key)

        if self.chat:
            self.remove_item(self.chat)
            self.chat.destroy()

    def add_chat(self, api_key: str=None) -> None:
        if api_key:
            self.api_key = api_key

        self.cursor.execute("INSERT OR REPLACE INTO secrets (key, value) VALUES ('GEMINI_API_KEY', ?)", (self.api_key,))
        self.db.commit()

        if self.chat:
            self.remove_item(self.chat)
            self.chat.destroy()
            self.chat = None
        
        self.chat = Chat(self)
        self.add_item(self.chat)
        self.remove_item(self.placeholder)

    def new_chat(self) -> None:
        if self.chat:
            try:
                return self.chat.new_chat()
            except Exception:
                pass
        
        self.add_chat()
