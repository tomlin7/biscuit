"""
Parts of the implementation is based on and are inspired by
Porcupine's LSP plugin https://github.com/Akuli/porcupine/
"""

from __future__ import annotations

import itertools
import typing
from pathlib import Path

import tarts as lsp

from biscuit.io import IO

from .data import *
from .handler import EventHandler
from .utils import *

if typing.TYPE_CHECKING:
    from src.biscuit.editor import Text

    from . import LanguageServerManager


class LangServerClient:
    """Language Server Client

    This class is used to manage the language server client. It is responsible for sending and receiving messages
    to and from the language server. It also manages the requests made by the user. It also manages the deletion of
    the language server client instance when all the tabs using the language server are closed.
    """

    completion_requests: dict[int, tuple[Text, CompletionRequest]] = {}
    gotodef_requests: dict[int, tuple[Text, str]] = {}
    hover_requests: dict[int, tuple[Text, str]] = {}
    outline_requests: dict[int, Text] = {}
    ref_requests: list[tuple[Text, str]] = []
    rename_requests: dict[int, Text] = {}

    def __init__(self, master: LanguageServerManager, tab: Text, root_dir: str) -> None:
        """Initialize the language server client

        Args:
            master (LanguageServerManager): The master language server manager
            tab (Text): The tab using the language server
            root_dir (str): The root directory of the language server"""

        self.master = master
        self.base = master.base
        self.tab = tab
        self.language = tab.language
        self.command = master.langservers.get(self.language, None)
        self.root_dir = root_dir
        self._counter = itertools.count()

        # TODO: Make this configurable from settings
        # when all tabs using this lsp are closed, delete the lsp client after deletion_delay milliseconds
        self.deletion_delay = 10000
        self.tabs_opened: set[Text] = set()
        self._count = 0

        self.client = lsp.Client(root_uri=Path(self.root_dir).as_uri())
        self.io = IO(self, self.command, self.root_dir)
        self.io.start()
        self.handler = EventHandler(self)

    def run_loop(self) -> None:
        """Run the language server client loop"""

        if self.run():
            self.base.after(50, self.run_loop)

    def run(self):
        """Run the language server client"""

        self.io.write(self.client.send())
        r = self.io.read()

        if not r:
            return True
        elif r == b"":
            return False

        try:
            for lsp_event in self.client.recv(r):
                self.handler.process(lsp_event)
        except Exception as e:
            print(e)

        return True

    def open_tab(self, tab: Text) -> None:
        """Send the did_open message to the language server client

        Args:
            tab (Text): The tab that is opened"""

        self.tabs_opened.add(tab)

        if self.client.state == lsp.ClientState.NORMAL:
            self.client.did_open(
                lsp.TextDocumentItem(
                    uri=Path(tab.path).as_uri(),
                    languageId=self.language,
                    text=tab.get_all_text(),
                    version=next(self._counter),
                )
            )

    def close_tab(self, tab: Text) -> None:
        """Send the did_close message to the language server client

        Args:
            tab (Text): The tab that is closed"""

        if not tab in self.tabs_opened:
            return

        self.tabs_opened.remove(tab)
        if self.client.state == lsp.ClientState.NORMAL:
            self.client.did_close(
                lsp.TextDocumentIdentifier(uri=Path(tab.path).as_uri())
            )

        if not self.tabs_opened:

            def delayed_removal(self=self):
                if self.tabs_opened:
                    return
                self.master.kill(self)

            if self.master.kill_thread:
                self.base.after_cancel(self.master.kill_thread)
            self.master.kill_thread = self.base.after(50000, delayed_removal)

    def request_completions(self, tab: Text) -> None:
        """Request completions from the language server

        Args:
            tab (Text): The tab requesting completions"""

        if tab.path is None or self.client.state != lsp.ClientState.NORMAL:
            return

        request = CompletionRequest(next(self._counter), tab.get_cursor_pos())
        req_id = self.client.completion(
            text_document_position=lsp.TextDocumentPosition(
                textDocument=lsp.TextDocumentIdentifier(uri=Path(tab.path).as_uri()),
                position=encode_position(request.cursor),
            ),
            context=lsp.CompletionContext(
                triggerKind=lsp.CompletionTriggerKind.INVOKED
            ),
        )

        self.completion_requests[req_id] = (tab, request)

    def request_hover(self, tab: Text) -> None:
        """Request hover information from the language server

        Args:
            tab (Text): The tab requesting hover information"""

        if tab.path is None or self.client.state != lsp.ClientState.NORMAL:
            return

        request_id = self.client.hover(
            lsp.TextDocumentPosition(
                textDocument=lsp.TextDocumentIdentifier(uri=Path(tab.path).as_uri()),
                position=encode_position(tab.get_mouse_pos()),
            )
        )
        self.hover_requests[request_id] = (tab, tab.get_mouse_pos())

    def request_go_to_definition(self, tab: Text) -> None:
        """Request go to definition from the language server

        Args:
            tab (Text): The tab requesting go to definition"""

        if tab.path is None or self.client.state != lsp.ClientState.NORMAL:
            return

        # very bad hack to ignore mouse and use cursor position
        tab.focus_set()
        pos = tab.get_mouse_pos()
        if pos == "1.0":
            pos = tab.get_cursor_pos()

        request_id = self.client.definition(
            lsp.TextDocumentPosition(
                textDocument=lsp.TextDocumentIdentifier(uri=Path(tab.path).as_uri()),
                position=encode_position(pos),
            )
        )
        self.gotodef_requests[request_id] = (tab, pos)

    def request_references(self, tab: Text) -> None:
        """Request references from the language server

        Args:
            tab (Text): The tab requesting references"""

        if tab.path is None or self.client.state != lsp.ClientState.NORMAL:
            return

        tab.focus_set()
        pos = tab.get_mouse_pos()
        if pos == "1.0":
            pos = tab.get_cursor_pos()

        request_id = self.client.references(
            lsp.TextDocumentPosition(
                textDocument=lsp.TextDocumentIdentifier(uri=Path(tab.path).as_uri()),
                position=encode_position(pos),
            )
        )
        self.ref_requests.append((tab, pos))

    def request_rename(self, tab: Text, new_name: str) -> None:
        """Request rename from the language server

        Args:
            tab (Text): The tab requesting rename
            new_name (str): The new name to be used"""

        if tab.path is None or self.client.state != lsp.ClientState.NORMAL:
            return

        tab.focus_set()
        pos = tab.get_cursor_pos()

        request_id = self.client.rename(
            lsp.TextDocumentPosition(
                textDocument=lsp.TextDocumentIdentifier(uri=Path(tab.path).as_uri()),
                position=encode_position(pos),
            ),
            new_name=new_name,
        )
        self.rename_requests[request_id] = tab

    def request_outline(self, tab: Text) -> None:
        """Request outline from the language server

        Args:
            tab (Text): The tab requesting outline"""

        if tab.path is None or self.client.state != lsp.ClientState.NORMAL:
            return

        request_id = self.client.documentSymbol(
            lsp.TextDocumentIdentifier(uri=Path(tab.path).as_uri()),
        )
        self.outline_requests[request_id] = tab

    def send_change_events(self, tab: Text) -> None:
        """Send the did_change message to the language server client

        Args:
            tab (Text): The tab that has changed"""

        if self.client.state != lsp.ClientState.NORMAL:
            return

        self.client.did_change(
            text_document=lsp.VersionedTextDocumentIdentifier(
                uri=Path(tab.path).as_uri(), version=next(self._counter)
            ),
            content_changes=[
                lsp.TextDocumentContentChangeEvent(
                    range=lsp.Range(
                        start=encode_position(tab.get_begin()),
                        end=encode_position(tab.get_end()),
                    ),
                    text=tab.get_all_text(),
                )
            ],
        )
