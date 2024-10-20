from __future__ import annotations

import multiprocessing
import os
import subprocess
import sys
import threading
import typing
from tkinter import filedialog
from tkinter.messagebox import askyesnocancel

from biscuit.common.actionset import ActionSet

from .common import BaseGame
from .config import ConfigManager
from .editor import *
from .gui import GUIManager
from .layout import *
from .settings import *
from .views import *

if typing.TYPE_CHECKING:
    from biscuit.editor import BaseEditor, Editor
    from biscuit.language.data import *

    from .layout import *


class EventManager(GUIManager, ConfigManager):
    """
    EVENT MANAGER
    -------------

    Event manager part of Biscuit Core.
    Manages the application events, actions, and interactions.
    """

    menubar: Menubar
    statusbar: Statusbar

    contentpane: Content
    editorsmanager: EditorsManager

    sidebar: SideBar
    secondary_sidebar: SecondarySideBar
    explorer: Explorer
    search: Search
    outline: Outline
    source_control: SourceControl
    extensionsGUI: Extensions

    panel: Panel
    terminalmanager: Terminal
    logger: Logs

    def set_title(self, title: str = None) -> None:
        if not self.initialized:
            return
        self.menubar.change_title(title)

    def open(self, path: str, warn_for_directory=False) -> None:
        """Opens file/directory based on path.

        TODO: Open directory in new window if warn_for_directory is True.
        """
        if not path:
            return

        if os.path.isdir(path):
            return self.open_directory(path)

        if os.path.isfile(path):
            return self.open_editor(path)

        self.notifications.error(f"Path does not exist: {path}")

    def open_directory(self, dir: str) -> None:
        if not dir or not os.path.isdir(dir):
            return

        self.statusbar.process_indicator.show()
        self.active_directory = dir

        self.explorer.directory.change_path(dir, create_root=False)
        self.set_title(os.path.basename(self.active_directory))

        self.editorsmanager.delete_all_editors()
        self.terminalmanager.delete_all_terminals()
        self.terminalmanager.open_terminal()

        try:
            self.git.check_git()
            self.update_git()
        except Exception as e:
            self.logger.error(f"Checking git failed: {e}")
            self.notifications.error("Checking git failed: see logs")

        self.explorer.directory.create_root(self.active_directory, subdir=False)

        self.event_generate("<<DirectoryChanged>>", data=dir)

    def update_git(self) -> None:
        self.statusbar.update_git_info()
        self.source_control.refresh()

    def clone_repo(self, url: str, new_window: bool = True) -> None:
        path = filedialog.askdirectory()
        if not path:
            return

        if new_window:
            new_window = askyesnocancel(
                "Open in new window or current",
                "Do you want to open the cloned repository in a new window?",
            )

        try:

            def clone() -> None:
                repodir = self.git.clone(url, path)
                if new_window:
                    self.open_in_new_window(repodir)
                else:
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
        self.event_generate("<<DirectoryChanged>>")

    def close_active_editor(self) -> None:
        self.editorsmanager.close_active_editor()

    def goto_location_in_active_editor(self, position: str) -> None:
        if editor := self.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.text.focus_set()
                editor.content.goto(position)

    def goto_location(self, path: str, position: str) -> None:
        if self.editorsmanager.is_open(path):
            if editor := self.editorsmanager.set_active_editor_by_path(path):
                editor.content.text.focus_set()
                editor.content.goto(position)
            return

        editor = self.open_editor(path, exists=True, load_file=False)
        editor.content.bind(
            "<<FileLoaded>>", lambda e, pos=position: editor.content.goto(pos), add=True
        )
        editor.content.load_file()

    def open_workspace_edit(self, path: str, edits: list[TextEdit]):
        if self.editorsmanager.is_open(path):
            e = self.editorsmanager.set_active_editor_by_path(path).content.text
            self.do_workspace_edits(e, edits)
            return

        editor = self.open_editor(path, exists=True, load_file=False)
        editor.content.bind(
            "<<FileLoaded>>",
            lambda _, editor=editor.content.text, edits=edits: threading.Thread(
                target=self.do_workspace_edits, args=(editor, edits), daemon=True
            ).start(),
            add=True,
        )
        editor.content.load_file()

    def do_workspace_edits(self, tab: Text, edits: list[TextEdit]):
        for i in edits:
            tab.replace(i.start, i.end, i.new_text)
            tab.update()
            tab.update_idletasks()

    def open_editor(
        self, path: str, exists=True, load_file=True
    ) -> Editor | BaseEditor:
        """Opens suitable editor based on the path, exists and load_file flags.

        `exists` flag will prioritize over `load_file`. If `exists` is False, `load_file` will be False.
        """

        if not path:
            exists = False

        elif not os.path.isfile(path):
            exists = False

        return self.editorsmanager.open_editor(path, exists, load_file)

    def open_files(self, paths: list[str]) -> None:
        for path in paths:
            self.open_editor(path)

    def open_diff(self, path: str, kind: str) -> None:
        # TODO kind kwarg
        self.editorsmanager.open_diff_editor(path, kind)  # type: ignore

    def diff_files(self, file1: str, file2: str) -> None:
        self.editorsmanager.diff_files(file1, file2, standalone=True)

    def open_settings(self, *_) -> None:
        self.editorsmanager.add_editor(SettingsEditor(self.editorsmanager))

    def open_game(self, name: str) -> None:
        self.editorsmanager.open_game(name)

    def register_game(self, game: BaseGame) -> None:
        # TODO game manager class
        self.game_manager.register_new_game(game)
        self.settings.generate_actionset()

    def register_langserver(self, language: str, command: str) -> None:
        self.language_server_manager.register_langserver(language, command)

    def register_comment_prefix(self, language: str, prefix: str) -> None:
        register_comment_prefix(language, prefix)

    def register_actionset(self, actionset: ActionSet) -> None:
        self.palette.register_actionset(actionset)

    def register_command(self, name: str, command: typing.Callable) -> None:
        self.settings.register_command(name, command)

    def register_run_command(self, language: str, command: str) -> None:
        self.execution_manager.register_command(language, command)

    def open_in_new_window(self, dir: str) -> None:
        subprocess.Popen([sys.executable, sys.argv[0], dir])

    def open_new_window(self) -> None:
        subprocess.Popen([sys.executable, sys.argv[0]])

        # from .main import get_app_instance
        # app = get_app_instance()
        # multiprocessing.freeze_support()
        # multiprocessing.Process(target=app.run).start()

    def workspace_opened(self) -> None:
        workspace = self.active_workspace
        try:
            self.open_directory(workspace.dirs[0])
            for dir in workspace.dirs[1:]:
                self.open_in_new_window(dir)
        except Exception as e:
            self.logger.error(f"Opening workspace failed: {e}")
            self.notifications.error("Opening workspace failed: see logs")

    def workspace_changed(self, dir: str) -> None:
        self.open_in_new_window(dir)

    def workspace_closed(self) -> None:
        self.close_active_directory()
        # TODO add cli args to flag new windows opened by workspace and close them

    def toggle_terminal(self) -> None:
        self.panel.switch_to_terminal()
        self.contentpane.toggle_panel()

    def update_statusbar(self) -> None:
        if editor := self.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                self.statusbar.toggle_editmode(True)
                active_text = editor.content.text
                self.statusbar.set_encoding(active_text.encoding)
                return self.statusbar.set_line_col_info(
                    active_text.line, active_text.column, len(active_text.selection)
                )

        self.statusbar.toggle_editmode(False)

    def log_error(self, message: str) -> None:
        self.logger.error(message)
        self.notifications.error(
            message, actions=[("Show logs", self.commands.show_logs)]
        )

    def log_info(self, message: str) -> None:
        self.logger.info(message)
        self.notifications.info(
            message, actions=[("Show logs", self.commands.show_logs)]
        )

    def log_warning(self, message: str) -> None:
        self.logger.warning(message)
        self.notifications.warning(
            message, actions=[("Show logs", self.commands.show_logs)]
        )

    def log_trace(self, message: str) -> None:
        self.logger.trace(message)
