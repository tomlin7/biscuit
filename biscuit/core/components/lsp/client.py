from __future__ import annotations

import os
import typing
from pathlib import Path

import sansio_lsp_client as lsp

from .data import *
from .handler import EventHandler
from .io import IO

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

        # TODO: Make this configurable
        # when all tabs using this lsp are closed, after this delay, delete the instance
        self.deletion_delay = 10000
        self.tabs_opened: set[Text] = set()
        self._count = 0
        
        self.io = IO(self, self.command, self.root_dir)
        self.io.start()
        self.client = lsp.Client(root_uri=Path(self.root_dir).as_uri())
        self.handler = EventHandler(self)

        # requests
        self._autocomplete_req = {}
        self._hover_requests = {}
        self._gotodef_requests = {}

    def run_loop(self) -> None:
        if self.run():
            self.base.after(50, self.run_loop)

    def run(self):
        b = self.client.send()
        self.io.write(b)
        r = self.io.read()
        if not r:
            return

        try:
            for lsp_event in self.client.recv(r):
                self.handler.process(lsp_event)
        except Exception as e:
            pass

    def open_tab(self, tab: Text) -> None:
        self.tabs_opened.add(tab)
        print(f"TAB MAPPED {tab.path}({self.language})")

        if self.client.state == lsp.ClientState.NORMAL:
            self.client.did_open(
                lsp.TextDocumentItem(
                    uri=Path(tab.path).as_uri(),
                    languageId=self.language,
                    text=tab.get_all_text(),
                    version=self._count,
                )
            )
            self._count += 1
    
    def close_tab(self, tab: Text) -> None:
        if not tab in self.tabs_opened:
            return
        
        self.tabs_opened.remove(tab)
        print(f"TAB UNMAPPED {tab.path}({self.language})")

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
