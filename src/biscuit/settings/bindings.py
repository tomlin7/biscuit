from __future__ import annotations

import typing

if typing.TYPE_CHECKING:
    from .. import Settings


class Bindings:
    """Class for managing key bindings"""

    def __init__(self, master: Settings) -> None:
        self.base = master.base

        self.new_file = "<Control-n>"
        self.new_window = "<Control-N>"
        self.open_file = "<Control-o>"
        self.open_dir = "<Control-O>"
        self.save = "<Control-s>"
        self.save_as = "<Control-S>"
        self.close_file = "<Control-w>"
        self.goto_line = "<Control-g>"
        self.quit = "<Control-q>"
        self.undo = "<Control-z>"
        self.redo = "<Control-y>"
        self.restore_closed_tab = "<Control-T>"
        self.close_all_tabs = "<Control-Shift-W>"
        self.change_tab = "<Control-Tab>"
        self.change_tab_back = "<Control-Shift-Tab>"
        self.split_tab = "<Control-\\>"

        self.command_palette = "<Control-P>"
        self.file_search = "<Control-p>"
        self.symbol_outline = "<Control-J>"

        self.panel = "<Control-grave>"
        self.sidebar = "<Control-b>"
        self.secondary_sidebar = "<Control-B>"
        self.directory_tree = "<Control-E>"
        self.extensions = "<Control-X>"
        self.global_search = "<Control-F>"
        self.debugger = "<Control-D>"
        self.git = "<Control-G>"
        self.assistant = "<Control-A>"
        self.logs = "<Control-U>"

        self.open_settings = "<Control-comma>"
        self.restore_recent_session = "<Control-Alt-r>"
        self.open_recent_folders = "<Control-r>"
        self.open_recent_files = "<Control-Shift-r>"
        self.open_recent_session = "<Control-Alt-R>"
