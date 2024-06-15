from __future__ import annotations

import os
import sqlite3
import typing

from ..drawer_view import NavigationDrawerView
from .chat import Chat
from .menu import AIMenu
from .placeholder import AIPlaceholder

if typing.TYPE_CHECKING:
    ...


class AI(NavigationDrawerView):
    """A view that displays the AI chat.

    The AI view allows the user to chat with an AI using the Gemini API.
    - The user can configure the API key to use for the chat, which is stored in the secrets database.
    - The chat can be refreshed to start a new chat."""

    def __init__(self, master, *args, **kwargs) -> None:
        self.__buttons__ = [
            ("refresh", self.new_chat),
        ]
        super().__init__(master, *args, **kwargs)
        self.__icon__ = "sparkle-filled"
        self.name = "AI"
        self.chat = None
        self.api_key = ""

        self.menu = AIMenu(self)
        self.add_action("ellipsis", self.menu.show)
        self.menu.add_command("New Chat", self.new_chat)
        self.menu.add_command("Configure API Key...", self.add_placeholder)

        self.db = sqlite3.connect(os.path.join(self.base.datadir, "secrets.db"))
        self.cursor = self.db.cursor()
        self.cursor.executescript(
            """
            CREATE TABLE IF NOT EXISTS secrets (key TEXT PRIMARY KEY NOT NULL, value TEXT);
            """
        )

        self.cursor.execute("SELECT value FROM secrets WHERE key='GEMINI_API_KEY'")
        api_key = self.cursor.fetchone()

        self.placeholder = AIPlaceholder(self)
        if api_key:
            self.add_chat(api_key[0])
        else:
            self.add_placeholder()

    def attach_file(self, *files: typing.List[str]) -> None:
        """Attach a file to the chat.

        Args:
            files (list): The list of files to attach to the chat."""

        if self.chat:
            self.chat.attach_file(*files)

    def add_placeholder(self) -> None:
        """Show the home page for the AI assistant view"""

        self.add_item(self.placeholder)
        if self.api_key:
            self.placeholder.api_key.set(self.api_key)

        if self.chat:
            self.remove_item(self.chat)
            self.chat.destroy()

    def add_chat(self, api_key: str = None) -> None:
        """Add a new chat to the view.

        Args:
            api_key (str): The API key to use for the chat. Defaults to configured."""

        if api_key:
            self.api_key = api_key

        if not self.api_key:
            return self.add_placeholder()

        self.cursor.execute(
            "INSERT OR REPLACE INTO secrets (key, value) VALUES ('GEMINI_API_KEY', ?)",
            (self.api_key,),
        )
        self.db.commit()

        if self.chat:
            self.remove_item(self.chat)
            self.chat.destroy()
            self.chat = None

        self.chat = Chat(self)
        self.add_item(self.chat)
        self.remove_item(self.placeholder)

    def new_chat(self) -> None:
        """Start a new chat with the AI assistant."""

        if self.chat:
            try:
                return self.chat.new_chat()
            except Exception:
                pass

        self.add_chat()
