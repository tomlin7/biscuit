from __future__ import annotations

import asyncio
import typing

from biscuit.common.ai import Agent
from biscuit.common.ai.providers import _auto_register, list_models, resolve
from biscuit.common.icons import Icons
from biscuit.common.ui import Frame

from ..sidebar_view_secondary import SideBarView
from .chat import AgentChat
from .placeholder import AIPlaceholder

if typing.TYPE_CHECKING:
    ...


class AI(SideBarView):
    """AI assistant sidebar view with provider-agnostic agent."""

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.__icon__ = Icons.SYMBOL_EVENT
        self.name = "Agent"
        self.chat = None
        self.agent = None
        self.attached_files: list[str] = []

        self.title.grid_forget()

_auto_register()
        self.available_models = list_models()
        self.current_model = self._load_default_model()

        self.top.grid_columnconfigure(self.column, weight=1)

        self.menu = self._build_menu()

        self.add_action(Icons.REFRESH, self.new_chat)
        self.add_action(Icons.COPY, self.copy_chat)
        self.add_action(Icons.ELLIPSIS, self.menu.show)
self.add_action(Icons.SETTINGS, self.open_settings)

        self.placeholder = AIPlaceholder(self)

        if self._has_any_key():
            self.add_chat()
        else:
            self.add_placeholder()

    def _load_default_model(self) -> str:
        models = list_models()
        ids = list(models.values())
        saved = self.base.config.get_nested("ai.default_model", "")
        if saved in ids:
            for name, mid in models.items():
                if mid == saved:
                    return name
        return ids[0] if ids else ""

    def _has_any_key(self) -> bool:
        for prov in ("gemini", "anthropic", "groq", "minimax"):
            key = self.base.config.get_nested(f"ai.keys.{prov}", "")
            if key:
                return True
        return False

    def _get_key_for_model(self, model_id: str) -> str:
        if "claude" in model_id:
            return self.base.config.get_nested("ai.keys.anthropic", "")
        if any(x in model_id for x in ("llama", "mixtral", "gemma", "qwen", "deepseek", "mistral")):
            return self.base.config.get_nested("ai.keys.groq", "")
        if "minimax" in model_id.lower():
            return self.base.config.get_nested("ai.keys.minimax", "")
        return self.base.config.get_nested("ai.keys.gemini", "")

    def _build_menu(self):
        from .menu import AIMenu
        menu = AIMenu(self)
        menu.add_command("New Chat", self.new_chat)
        menu.add_command("Configure AI Providers...", self.open_settings)
        menu.add_separator()
        menu.add_command("View Stats", self.show_stats)
        return menu

    def open_settings(self, *_):
        from biscuit.settings.editor import SettingsEditor
        self.base.editorsmanager.add_editor(SettingsEditor(self.base.editorsmanager))

    def set_current_model(self, model_name: str) -> None:
        if model_name == self.current_model:
            return
        self.current_model = model_name
        self.new_chat()

    def attach_file(self, *files: typing.List[str]) -> None:
        for f in files:
            if f not in self.attached_files:
                self.attached_files.append(f)
        if self.agent:
            self.agent.set_attached_files(self.attached_files)

    def add_placeholder(self) -> None:
        self.add_item(self.placeholder)
        if self.chat:
            self.remove_item(self.chat)
            self.chat.destroy()
            self.chat = None
        if self.agent:
            self.agent.stop_execution()
            self.agent = None

def add_chat(self) -> None:
        if self.chat:
            self.remove_item(self.chat)
            self.chat.destroy()
            self.chat = None

        if self.agent:
            self.agent.stop_execution()
            self.agent = None

        try:
model_id = self.available_models.get(self.current_model, "")
            api_key = self._get_key_for_model(model_id)

            if not api_key:
                if not self._has_any_key():
                    self.add_placeholder()
                    return
                self.base.notifications.warning(f"No API key configured for model '{self.current_model}'. Open Settings (Ctrl+,) to configure.")
                return

            self.agent = Agent(self.base, api_key, model_id)
            if self.attached_files:
                self.agent.set_attached_files(self.attached_files)

            self._start_mcp()

            self.chat = AgentChat(self)
            self.chat.set_enhanced_agent(self.agent)
            self.add_item(self.chat)
            self.remove_item(self.placeholder)

        except Exception as e:
            if self.base.logger:
                self.base.logger.error(f"Failed to initialize AI agent: {e}")
            if self.base.notifications:
                self.base.notifications.error(
                    f"Failed to initialize AI agent: {e}",
                    actions=[("Open Settings", self.open_settings)],
                )

    def _start_mcp(self):
        try:
            mcp_cfg = self.base.config.get_nested("ai.mcp_servers", {})
            if not mcp_cfg or not isinstance(mcp_cfg, dict):
                return
            from biscuit.common.ai.mcp import MCPManager
            mcp = MCPManager(self.base)
            mcp.load_from_config(mcp_cfg)

            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(mcp.start_all())

            mcp_tools = mcp.get_all_tools()
            if mcp_tools:
                self.agent.set_mcp_tools(mcp_tools)
                self._mcp = mcp
        except Exception as e:
            if self.base.logger:
                self.base.logger.warning(f"MCP initialization failed: {e}")

    def new_chat(self) -> None:
        if self.chat:
            self.chat.destroy()
        self.add_chat()
        if self.attached_files and self.agent:
            self.agent.set_attached_files(self.attached_files)

    def copy_chat(self) -> None:
        if self.chat:
            text = self.chat.get_conversation_text()
            self.base.clipboard_clear()
            self.base.clipboard_append(text)
            self.base.update()
            if self.base.notifications:
                self.base.notifications.info("Conversation copied to clipboard")

    def show_stats(self) -> None:
        try:
            if self.base.notifications:
                msg = f"Model: {self.current_model}"
                if self.agent:
                    msg += f" | Tokens: {self.agent.input_tokens + self.agent.output_tokens}"
                self.base.notifications.info(msg)
        except Exception as e:
            print(f"Error showing stats: {e}")
