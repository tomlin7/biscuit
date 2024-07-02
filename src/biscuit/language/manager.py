from __future__ import annotations

import os
import typing

import tarts as lsp

from .client import LangServerClient
from .languages import Languages
from .utils import decode_position

if typing.TYPE_CHECKING:
    from biscuit import App
    from biscuit.editor.text import Text


class LanguageServerManager:
    """Language Server Manager

    This class is used to manage the language server clients. It is responsible for creating, updating, and deleting
    the language server clients. It also manages the requests made by the user to the language server clients.
    """

    def __init__(self, base: App):
        self.base = base

        self.langservers: dict[str, str] = {}

        # built-in support for python-lsp-server
        self.langservers[Languages.PYTHON] = "pylsp"

        self.existing: dict[str, LangServerClient] = {}
        self.latest: LangServerClient = None

        self.kill_thread = None

    def _update_symbols(
        self, tab: Text, resp: typing.List[lsp.SymbolInformation]
    ) -> None:
        try:
            self.base.settings.symbols_actionset.update(
                [
                    (
                        i.name,
                        lambda _, i=i: self.base.goto_location_in_active_editor(
                            decode_position(i.location.range.start)
                        ),
                    )
                    for i in resp
                ]
            )
            self.base.palette.update()
        except:
            # TODO: currently only supports lsp.SymbolInformation; implement this for lsp.DocumentSymbol
            pass

    def register_langserver(self, language: str, command: str) -> None:
        """Register a language server for a specific language

        Args:
            language (str): The language for which the language server is being registered
            command (str): The command to start the language server
        """

        self.langservers[language] = command

    def tab_opened(self, tab: Text) -> None:
        """Let the language server know that a tab has been opened"""

        self.latest = self.request_client_instance(tab)
        if self.latest:
            self.latest.open_tab(tab)
            self.latest.request_outline(tab)
        return self.latest is not None

    def request_removal(self, tab: Text) -> None:
        """Request the language server to remove a tab"""

        for instance in list(self.existing.values()):
            instance.close_tab(tab)

    def tab_closed(self, tab: Text) -> None:
        """Let the language server know that a tab has been closed"""

        if inst := self.request_client_instance(tab):
            inst.close_tab(tab)

    def request_completions(self, tab: Text) -> None:
        """Request completions from the language server for a tab"""

        for instance in list(self.existing.values()):
            if tab in instance.tabs_opened:
                instance.request_completions(tab)

    def request_goto_definition(self, tab: Text) -> None:
        """Request the language server to go to the definition of a symbol in a tab"""

        for instance in list(self.existing.values()):
            if tab in instance.tabs_opened:
                instance.request_go_to_definition(tab)

    def request_references(self, tab: Text) -> None:
        """Request references to a symbol in a tab from the language server"""

        for instance in list(self.existing.values()):
            if tab in instance.tabs_opened:
                instance.request_references(tab)

    def request_rename(self, tab: Text, new_name: str) -> None:
        """Request the language server to rename a symbol in a tab"""

        for instance in list(self.existing.values()):
            if tab in instance.tabs_opened:
                instance.request_rename(tab, new_name)

    def request_hover(self, tab: Text) -> None:
        """Request the language server to provide a hover for a symbol in a tab"""

        for instance in list(self.existing.values()):
            if tab in instance.tabs_opened:
                instance.request_hover(tab)

    def request_outline(self, tab: Text) -> None:
        """Request the language server to provide an outline for a tab"""

        for instance in list(self.existing.values()):
            if tab in instance.tabs_opened:
                instance.request_outline(tab)

    def content_changed(self, tab: Text) -> None:
        """Content of a tab has changed, notify the language server about it"""

        for instance in list(self.existing.values()):
            if tab in instance.tabs_opened:
                instance.send_change_events(tab)

    def request_client_instance(self, tab: Text) -> LangServerClient | None:
        """Request a language server client instance for a specific language and workspace root directory.

        If a client instance already exists for the language and the root directory of the tab, it is returned.
        Otherwise, a new client instance is created and returned.

        Args:
            tab (Text): The tab for which the language server client instance is being requested
        """

        if tab.path is None or (
            tab.language not in self.langservers.keys()
            and tab.language_alias not in self.langservers.keys()
        ):
            return

        root_dir = self.base.active_directory or os.path.dirname(tab.path)

        try:
            return self.existing[(root_dir, tab.language_alias)]
        except KeyError:
            pass

        self.base.statusbar.process_indicator.show()
        self.base.logger.trace(
            f"<<-- Requesting <LSPC>({tab.language_alias}) instance for --[{root_dir}] -->>"
        )
        self.base.logger.trace(f"Command: {self.langservers[tab.language_alias]}")

        # TODO multithread this process
        langserver = LangServerClient(self, tab, root_dir)
        langserver.run_loop()
        self.existing[(root_dir, tab.language_alias)] = langserver

        return langserver

    def kill(self, instance: LangServerClient) -> None:
        """Kill a language server client instance

        Args:
            instance (LangServerClient): The language server client instance to be killed
        """

        if not self.existing.get((instance.root_dir, instance.language), None):
            return

        self.base.logger.trace(
            f"-- Killing LSPC({instance.language}) PID: {instance.io.p.pid} --"
        )

        self.existing.pop((instance.root_dir, instance.language))
        if instance.client.state == lsp.ClientState.NORMAL:
            instance.client.shutdown()
        else:
            instance.io.p.kill()

        del instance
