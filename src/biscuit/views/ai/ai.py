from __future__ import annotations

import os
import sqlite3
import tkinter as tk
import typing

from biscuit.common import Dropdown
from biscuit.common.ai import Agent
from biscuit.common.icons import Icons

from ..sidebar_view_secondary import SideBarView
from .menu import AIMenu
from .modern_chat import ModernAIChat
from .placeholder import AIPlaceholder

if typing.TYPE_CHECKING:
    ...


class AI(SideBarView):
    """Enhanced AI view with LangChain integration and multiple modes.

    The AI view provides three modes of operation:
    1. Coding Agent: Full access with all tools
    2. Ask Mode: Q&A with file attachments  
    3. Edit Mode: Focused editing assistance
    
    All modes are powered by LangChain with selectable Gemini models.
    """

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.__icon__ = Icons.SPARKLE_FILLED
        self.name = "AI"
        self.chat = None
        self.api_key = ""
        self.agent = None

        self.title.grid_forget()

        # Available Gemini models for LangChain
        self.available_models = {
            "Gemini 2.0 Flash": "gemini-2.0-flash-exp",
            "Gemini 1.5 Flash": "gemini-1.5-flash",
            "Gemini 1.5 Pro": "gemini-1.5-pro",
            "Gemini 2.0 Flash Thinking": "gemini-2.0-flash-thinking-exp"
        }
        self.current_model = "Gemini 2.0 Flash"

        self.dropdown = Dropdown(
            self.top,
            items=self.available_models.keys(),
            selected=self.current_model,
            callback=self.set_current_model,
        )
        self.top.grid_columnconfigure(self.column, weight=1)
        self.dropdown.grid(row=0, column=0, sticky=tk.NSEW, padx=(0, 10))

        self.menu = AIMenu(self)
        self.menu.add_command("New Chat", self.new_chat)
        self.menu.add_command("Configure API Key...", self.add_placeholder)
        self.menu.add_separator()
        self.menu.add_command("View Stats", self.show_stats)

        self.add_action(Icons.REFRESH, self.new_chat)
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
        """Register a new model provider.

        Args:
            provider (str): The display name for the provider
            model_name (str): The actual model name (optional, uses provider name)"""

        if not model_name:
            model_name = provider.lower().replace(' ', '-')
        
        self.available_models[provider] = model_name
        self.dropdown.add_command(provider)

    def set_current_model(self, model_name: str) -> None:
        """Set the current model for the AI agent.

        Args:
            model_name (str): The model to set as current."""

        if model_name == self.current_model:
            return

        self.current_model = model_name
        
        # Update agent if it exists
        if self.agent:
            try:
                # Update agent model
                model_id = self.available_models[model_name]
                self.agent.update_model(model_id)
            except Exception as e:
                self.base.logger.error(f"Failed to update model: {e}")
                # Recreate the chat with new agent
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
            self.chat = None

        if self.agent:
            self.agent = None

    def add_chat(self, api_key: str = None) -> None:
        """Add a new chat to the view.

        Args:
            api_key (str): The API key to use for the chat. Defaults to configured."""

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
            self.agent = None

        # Create enhanced chat with LangChain agent
        try:
            # Create agent with selected model
            model_id = self.available_models[self.current_model]
            self.agent = Agent(self.base, self.api_key, model_id)
            
            self.chat = ModernAIChat(self)
            self.chat.set_enhanced_agent(self.agent)
            
            self.add_item(self.chat)
            self.remove_item(self.placeholder)
            
        except Exception as e:
            # Safe error logging - check if logger is available
            try:
                if hasattr(self.base, 'logger'):
                    self.base.logger.error(f"Failed to initialize AI agent: {e}")
                else:
                    print(f"AI Agent Error: {e}")
            except:
                print(f"AI Agent Error: {e}")
                
            # Safe notification - check if notifications is available  
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
        """Start a new chat with the AI assistant."""

        if self.chat:
            try:
                return self.chat.new_chat()
            except Exception:
                pass

        self.add_chat()

    def show_stats(self) -> None:
        """Show AI agent statistics."""
        try:
            if self.chat and hasattr(self.chat, 'get_stats'):
                stats = self.chat.get_stats()
                if stats:
                    stats_text = f"AI Agent Statistics\\n\\nCurrent Model: {self.current_model}\\n\\n"
                    for key, value in stats.items():
                        stats_text += f"{key.replace('_', ' ').title()}: {value}\\n"
                    
                    if hasattr(self.base, 'notifications'):
                        self.base.notifications.info(stats_text)
                    else:
                        print(f"AI Statistics: {stats_text}")
                else:
                    if hasattr(self.base, 'notifications'):
                        self.base.notifications.info("No statistics available")
                    else:
                        print("No statistics available")
            else:
                if hasattr(self.base, 'notifications'):
                    self.base.notifications.info("No active AI agent to show statistics for")
                else:
                    print("No active AI agent to show statistics for")
        except Exception as e:
            print(f"Error showing stats: {e}")
