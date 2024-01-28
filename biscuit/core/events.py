from __future__ import annotations

import threading
import typing
import os

if typing.TYPE_CHECKING:
    from .layout import *

from .components import *
from .settings import *

from .config import ConfigManager


class EventManager(ConfigManager):
    """
    EVENT MANAGER
    -------------

    Event manager part of Biscuit Core.
    """

    menubar: Menubar
    statusbar: Statusbar

    contentpane: ContentPane
    editorsmanager: EditorsPane

    sidebar: Sidebar
    explorer: Explorer
    search: Search
    outline: Outline
    source_control: SourceControl
    extensionsGUI: Extensions
    
    panel: Panel
    terminalmanager: Terminal
    logger: Logs

    def set_title(self, title: str=None) -> None:
        if not self.initialized:
            return
        self.menubar.set_title(title)
        self.menubar.reposition_title()

    def open_directory(self, dir: str) -> None:
        if not dir or not os.path.isdir(dir):
            return

        self.active_directory = dir
        self.explorer.directory.change_path(dir)
        self.set_title(os.path.basename(self.active_directory))

        self.editorsmanager.delete_all_editors()
        self.terminalmanager.delete_all_terminals()
        self.terminalmanager.open_terminal()

        self.git.check_git()
        self.update_git()

    def update_git(self) -> None:
        self.statusbar.update_git_info()
        self.source_control.refresh()

    def clone_repo(self, url: str, dir: str) -> None:
        try:
            def clone() -> None:
                repodir = self.git.clone(url, dir)
                self.open_directory(repodir)

            temp = threading.Thread(target=clone)
            temp.daemon = True
            temp.start()

        except Exception as e:
            self.logger.error(f"Cloning repository failed: {e}")
            self.notifications.error("Cloning repository failed: see logs")
            return

    def close_active_directory(self) -> None:
        self.active_directory = None
        self.explorer.directory.close_directory()
        self.editorsmanager.delete_all_editors()
        self.set_title()
        self.git_found = False
        self.update_git()

    def close_active_editor(self) -> None:
        self.editorsmanager.close_active_editor()

    def goto_location_in_active_editor(self, position: int) -> None:
        if editor := self.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.goto(position)

    def goto_location(self, path: str, position: int) -> None:
        if self.editorsmanager.is_open(path):
            self.editorsmanager.set_active_editor_by_path(path).content.goto(position)
            return

        editor = self.open_editor(path, exists=True)
        editor.bind("<<FileLoaded>>", lambda e: editor.content.goto(position))

    def open_editor(self, path: str, exists: bool=True) -> Editor | BaseEditor:
        if exists and not os.path.isfile(path):
            return

        return self.editorsmanager.open_editor(path, exists)

    def open_diff(self, path: str, kind: str) -> None:
        self.editorsmanager.open_diff_editor(path, kind) # type: ignore

    def open_settings(self, *_) -> None:
        self.editorsmanager.add_editor(SettingsEditor(self.editorsmanager))

    def open_game(self, name: str) -> None:
        self.editorsmanager.open_game(name)

    def register_game(self, game: BaseGame) -> None:
        #TODO game manager class
        register_game(game)
        self.settings.gen_actionset()

    def register_langserver(self, language: str, command: str) -> None:
        self.language_server_manager.register_langserver(language, command)

    def open_in_new_window(self, dir: str) -> None:
        #Process(target=App(sys.argv[0], dir).run).start()
        self.notifications.show("Feature not available in this version.")

    def open_new_window(self) -> None:
        # Process(target=App(sys.argv[0]).run).start()
        self.notifications.show("Feature not available in this version.")

    def toggle_terminal(self) -> None:
        self.panel.set_active_view(self.panel.terminal)
        self.contentpane.toggle_panel()

    def update_statusbar(self) -> None:
        if editor := self.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                self.statusbar.toggle_editmode(True)
                active_text = editor.content.text
                self.statusbar.set_encoding(active_text.encoding)
                return self.statusbar.set_line_col_info(
                    active_text.line, active_text.column, len(active_text.selection))

        self.statusbar.toggle_editmode(False)