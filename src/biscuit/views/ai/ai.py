from __future__ import annotations

import os
import sqlite3
import tkinter as tk
import typing

from biscuit.common import Dropdown
from biscuit.common.chat import ChatModelInterface, Gemini1p5Flash
from biscuit.common.icons import Icons

from ..sidebar_view import SideBarView
from .chat import Chat
from .menu import AIMenu
from .placeholder import AIPlaceholder

if typing.TYPE_CHECKING:
    ...


PROMPT = """You are an assistant part of Biscuit code editor named Bikkis. 
You are an expert programmer, you'll help the user with his queries.

Biscuit have many features like auto completions, git integration,
code diagnostics, code refactoring, code navigation, advanced search, etc.
It supports many languages like Python, JavaScript, Java, C++, etc.
User can install extensions right within the editor's extension marketplace.
Don't make assumptions about the existence of a feature in Biscuit.

Give the user minimal responses and be straightforward. 
If there are files attached by user, they will be appended to the question.
You will have to consider them while responding.

Reply to this message from user: """


class AI(SideBarView):
    """A view that displays the AI chat.

    The AI view allows the user to chat with an AI using the Gemini API.
    - The user can configure the API key to use for the chat, which is stored in the secrets database.
    - The chat can be refreshed to start a new chat."""

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.__icon__ = Icons.SPARKLE_FILLED
        self.name = "AI"
        self.chat = None
        self.api_key = ""

        self.api_providers = {
            "Gemini 1.5 Flash": Gemini1p5Flash,
        }
        self.current_provider = "Gemini 1.5 Flash"

        self.dropdown = Dropdown(
            self.top,
            items=self.api_providers.keys(),
            selected=self.current_provider,
            callback=self.set_current_provider,
        )
        self.top.grid_columnconfigure(self.column, weight=1)
        self.dropdown.grid(row=0, column=self.column, sticky=tk.NSEW, padx=(0, 10))
        self.column += 1

        self.menu = AIMenu(self)
        self.menu.add_command("New Chat", self.new_chat)
        self.menu.add_command("Configure API Key...", self.add_placeholder)

        self.add_action(Icons.REFRESH, self.new_chat)
        self.add_action(Icons.ELLIPSIS, self.menu.show)

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

    def register_provider(self, provider: str, model: ChatModelInterface) -> None:
        """Register a new provider for the chat.

        Args:
            provider (str): The provider to register."""

        self.api_providers[provider] = model
        self.dropdown.add_command(provider)

    def set_current_provider(self, provider: str) -> None:
        """Set the current provider for the chat.

        Args:
            provider (str): The provider to set as the current provider."""

        if provider == self.current_provider:
            return

        self.current_provider = provider
        self.add_chat()

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
        self.chat.set_model(self.get_model_instance(PROMPT))
        self.add_item(self.chat)
        self.remove_item(self.placeholder)

    def get_model_instance(self, prompt: str) -> ChatModelInterface:
        """Get the model instance for the current provider.

        Returns:
            ChatModelInterface: The model instance for the current provider."""

        return self.api_providers[self.current_provider](self.api_key, prompt)

    def new_chat(self) -> None:
        """Start a new chat with the AI assistant."""

        if self.chat:
            try:
                return self.chat.new_chat()
            except Exception:
                pass

        self.add_chat()
