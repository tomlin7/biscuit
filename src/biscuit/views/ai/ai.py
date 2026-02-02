from __future__ import annotations

import os
import sqlite3
import tkinter as tk
import typing

from biscuit.common import Dropdown
from biscuit.common.ai import Agent
from biscuit.common.icons import Icons
from biscuit.common.ui import Frame

from ..sidebar_view_secondary import SideBarView
from .menu import AIMenu
from .modern_chat import ModernAIChat
from .placeholder import AIPlaceholder
from .renderer import Renderer

if typing.TYPE_CHECKING:
    ...


class AI(SideBarView):
    """Enhanced AI view with LangChain integration and multiple modes.

    The AI view provides a powerful autonomous coding agent powered by LangChain.
    """

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.__icon__ = Icons.SPARKLE_FILLED
        self.name = "AI"
        self.chat = None
        self.api_key = ""
        self.agent = None

        self.title.grid_forget()

        # Available Gemini models
        self.available_models = {
            "Gemini 2.0 Flash": "gemini-2.0-flash",
            "Gemini 2.0 Pro": "gemini-2.0-pro",
            "Gemini 2.5 Flash": "gemini-2.5-flash",
            "Gemini 2.5 Pro": "gemini-2.5-pro",
        }
        self.current_model = "Gemini 2.0 Flash"

        self.top.grid_columnconfigure(self.column, weight=1)

        self.menu = AIMenu(self)
        self.menu.add_command("New Chat", self.new_chat)
        self.menu.add_command("Configure API Key...", self.add_placeholder)
        self.menu.add_separator()
        self.menu.add_command("View Stats", self.show_stats)

        self.add_action(Icons.REFRESH, self.new_chat)
        self.add_action(Icons.COPY, self.copy_chat)
        self.add_action(Icons.ELLIPSIS, self.menu.show)

        # Database setup
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

    def register_provider(self, provider: str, model_name: str = None) -> None:
        """Register a new model provider."""
        if not model_name:
            model_name = provider.lower().replace(' ', '-')
        
        self.available_models[provider] = model_name
        # The dropdown will be updated on next chat creation

    def set_current_model(self, model_name: str) -> None:
        """Set the current model."""
        if model_name == self.current_model:
            return

        self.current_model = model_name
        self.new_chat() # Restart chat with new model

    def attach_file(self, *files: typing.List[str]) -> None:
        """Attach a file to the chat."""
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
            self.chat = None

        if self.agent:
            self.agent = None

    def add_chat(self, api_key: str = None) -> None:
        """Add a new chat to the view."""
        if api_key:
            self.api_key = api_key

        if not self.api_key:
            return self.add_placeholder()

        # Store API key
        self.cursor.execute(
            "INSERT OR REPLACE INTO secrets (key, value) VALUES ('GEMINI_API_KEY', ?)",
            (self.api_key,),
        )
        self.db.commit()

        # Clean up existing chat
        if self.chat:
            self.remove_item(self.chat)
            self.chat.destroy()
            self.chat = None

        if self.agent:
            self.agent.stop_execution()
            self.agent = None

        try:
            model_id = self.available_models[self.current_model]
            self.agent = Agent(self.base, self.api_key, model_id)
            
            self.chat = ModernAIChat(self)
            self.chat.set_enhanced_agent(self.agent)
            
            self.add_item(self.chat)
            self.remove_item(self.placeholder)
            
        except Exception as e:
            try:
                if hasattr(self.base, 'logger'):
                    self.base.logger.error(f"Failed to initialize AI agent: {e}")
                else:
                    print(f"AI Agent Error: {e}")
                    raise e
            except:
                print(f"AI Agent Error: {e}")
                raise e
                
            try:
                if hasattr(self.base, 'notifications'):
                    self.base.notifications.error(
                        f"Failed to initialize AI agent: {str(e)}",
                        actions=[
                            ("Configure API Key", self.add_placeholder),
                            ("Try Again", self.add_chat)
                        ]
                    )
            except:
                print(f"Failed to show notification: {e}")

    def new_chat(self) -> None:
        """Start a new chat."""
        if self.chat:
            self.chat.destroy()
        self.add_chat()

    def copy_chat(self) -> None:
        """Copy the current conversation to clipboard."""
        if self.chat:
            text = self.chat.get_conversation_text()
            self.base.clipboard_clear()
            self.base.clipboard_append(text)
            self.base.update() # Required for clipboard append to work
            if hasattr(self.base, 'notifications'):
                self.base.notifications.info("Conversation copied to clipboard")


    def show_stats(self) -> None:
        """Show AI agent statistics."""
        try:
            if hasattr(self.base, 'notifications'):
                msg = f"Model: {self.current_model}"
                self.base.notifications.info(msg)
        except Exception as e:
            print(f"Error showing stats: {e}")
