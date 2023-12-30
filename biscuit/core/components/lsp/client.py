from __future__ import annotations

import itertools
import tkinter as tk
import typing
from pathlib import Path

import sansio_lsp_client as lsp

from .data import *
from .handler import EventHandler
from .io import IO
from .utils import *

if typing.TYPE_CHECKING:
    from biscuit.core import App
    from biscuit.core.components.editors.texteditor.text import Text

    from . import LanguageServerManager

class LangServerClient:
    def __init__(self, master: LanguageServerManager, tab: Text, root_dir: str) -> None:
        self.master = master
        self.base = master.base
        self.tab = tab
        self.language = tab.language
        self.command = master.langservers.get(self.language, None)
        self.root_dir = root_dir
        self._counter = itertools.count()

        # TODO: Make this configurable
        # when all tabs using this lsp are closed, after this delay, delete the instance
        self.deletion_delay = 10000
        self.tabs_opened: set[Text] = set()
        self._count = 0
        
        self.client = lsp.Client(root_uri=Path(self.root_dir).as_uri())
        self.io = IO(self, self.command, self.root_dir)
        self.io.start()
        self.handler = EventHandler(self)

        # requests
        self._autocomplete_req: dict[int, tuple[Text, CompletionRequest]] = {}
        self._hover_requests: dict[int, tuple[Text, str]] = {}
        self._gotodef_requests: dict[int, tuple[Text, str]] = {}

    def run_loop(self) -> None:
        if self.run():
            self.base.after(50, self.run_loop)

    def run(self):
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
            pass

        return True

    def open_tab(self, tab: Text) -> None:
        self.tabs_opened.add(tab)
        print(f"TAB MAPPED {tab.path}({self.language})")

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
            self.master.kill_thread = self.base.after(5000, delayed_removal)

    def request_completions(self, tab: Text) -> None:
        if tab.path is None or self.client.state != lsp.ClientState.NORMAL:
            print("LSPC: Not ready for completions")
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

        self._autocomplete_req[req_id] = (tab, request)
    
    def request_hover(self, tab: Text) -> None:
        if tab.path is None or self.client.state != lsp.ClientState.NORMAL:
            return
        
        request_id = self.client.hover(
            lsp.TextDocumentPosition(
                textDocument=lsp.TextDocumentIdentifier(uri=Path(tab.path).as_uri()),
                position=encode_position(tab.get_mouse_pos()),
            )
        )
        print(f">>>> HOVER REQUESTED {tab.path} at {tab.get_mouse_pos()}")
        self._hover_requests[request_id] = (tab, tab.get_mouse_pos())
    
    def request_go_to_definition(self, tab: Text) -> None:
        if tab.path is None or self.client.state != lsp.ClientState.NORMAL:
            return
        
        request_id = self.client.definition(
            lsp.TextDocumentPosition(
                textDocument=lsp.TextDocumentIdentifier(uri=Path(tab.path).as_uri()),
                position=encode_position(tab.get_mouse_pos()),
            )
        )
        self._gotodef_requests[request_id] = (tab, tab.get_mouse_pos())

    def send_change_events(self, tab: Text) -> None:
        if self.client.state != lsp.ClientState.NORMAL:
            return

        self.client.did_change(
            text_document=lsp.VersionedTextDocumentIdentifier(
                uri=Path(tab.path).as_uri(), version=next(self._counter)
            ),
            content_changes=[
                lsp.TextDocumentContentChangeEvent(
                    range=lsp.Range(
                        start=encode_position(tab.get_begin()), end=encode_position(tab.get_end())
                    ),
                    text=tab.get_all_text(),
                )
            ],
        )
