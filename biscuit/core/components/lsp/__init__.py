from __future__ import annotations

import os
import typing

import sansio_lsp_client as lsp

from .client import LangServerClient

if typing.TYPE_CHECKING:
    from biscuit.core import App
    from biscuit.core.components.editors.texteditor import Text
    
class LanguageServerManager:
    def __init__(self, base: App):
        self.base = base
        
        self.langservers: dict[str, str] = {'Python': 'pylsp', }
        self.existing: dict[str, LangServerClient] = {}
        self.latest: LangServerClient = None

        self.kill_thread = None

    def register_langserver(self, language, command) -> None:
        self.langservers[language] = command
    
    def tab_opened(self, tab: Text) -> None:
        self.latest = self.request_client_instance(tab)
        if self.latest:
            self.latest.open_tab(tab)
        return self.latest is not None
   
    def request_removal(self, tab: Text) -> None:
        for instance in list(self.existing.values()):
            instance.close_tab(tab)

    def tab_closed(self, tab: Text) -> None:
        if inst :=  self.request_client_instance(tab):
            inst.close_tab(tab)

    def request_completions(self, tab: Text) -> str | None:
        for instance in list(self.existing.values()):
            if tab in instance.tabs_opened:
                instance.request_completions(tab)

    def request_goto_definition(self, tab: Text) -> str:
        for instance in list(self.existing.values()):
            if tab in instance.tabs_opened:
                instance.request_go_to_definition(tab)

    def request_hover(self, tab: Text) -> str | None:
        for instance in list(self.existing.values()):
            if tab in instance.tabs_opened:
                instance.request_hover(tab)

    def content_changed(self, tab: Text) -> None:
        for instance in list(self.existing.values()):
            if tab in instance.tabs_opened:
                instance.send_change_events(tab)

    def request_client_instance(self, tab: Text) -> LangServerClient | None:
        if tab.path is None or not tab.language or tab.language not in self.langservers.keys():
            return
        
        root_dir = self.base.active_directory or os.path.dirname(tab.path)

        try:
            return self.existing[(root_dir, tab.language)]
        except KeyError:
            pass

        print(f"<<-- Requesting <LSPC>({tab.language}) instance for --[{root_dir}] -->>")

        # TODO multithread this process
        langserver = LangServerClient(self, tab, root_dir)
        langserver.run_loop()
        self.existing[(root_dir, tab.language)] = langserver

        
        return langserver

    def kill(self, instance: LangServerClient) -> None:
        if not self.existing.get((instance.root_dir, instance.language), None):
            return
        
        print(f"-- Killing LSPC({instance.language}) PID: {instance.io.p.pid} --")
        
        self.existing.pop((instance.root_dir, instance.language))
        if instance.client.state == lsp.ClientState.NORMAL:
            instance.client.shutdown()
        else:
            instance.io.p.kill()          

        del instance
