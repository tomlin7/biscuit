from __future__ import annotations

import typing

if typing.TYPE_CHECKING:
    from . import App


class Binder:
    """Class for binding events to keys"""

    def __init__(self, base: App) -> None:
        self.base = base

        self.bindings = self.base.settings.bindings
        self.events = self.base.commands

        self.bind_all()

    def bind_all(self) -> None:
        """Bind all bindings from config"""

        self.bind(self.bindings.new_file, self.events.new_file)
        self.bind(self.bindings.new_window, self.events.new_window)
        self.bind(self.bindings.open_file, self.events.open_file)
        self.bind(self.bindings.open_dir, self.events.open_directory)
        self.bind(self.bindings.save, self.events.save_file)
        self.bind(self.bindings.save_as, self.events.save_file_as)
        self.bind(self.bindings.close_file, self.events.close_editor)
        self.bind(self.bindings.quit, self.events.quit_biscuit)
        self.bind(self.bindings.undo, self.events.undo)
        self.bind(self.bindings.redo, self.events.redo)
        self.bind(
            self.bindings.restore_closed_tab, self.events.restore_last_closed_editor
        )
        self.bind(self.bindings.close_all_tabs, self.events.close_all_editors)
        self.bind(self.bindings.change_tab, self.events.change_tab_forward)
        self.bind(self.bindings.change_tab_back, self.events.change_tab_back)
        self.bind(self.bindings.split_tab, self.events.split_editor)

    def late_bind_all(self) -> None:
        """Bindings that require full initialization"""

        self.bind(self.bindings.command_palette, self.events.show_command_palette)
        self.bind(self.bindings.file_search, self.events.search_files)
        self.bind(self.bindings.symbol_outline, self.events.show_symbol_palette)
        self.bind(self.bindings.goto_line, self.events.goto_line_column)

        self.bind(self.bindings.panel, self.base.contentpane.toggle_panel)
        self.bind(self.bindings.sidebar, self.events.toggle_sidebar)
        self.bind(self.bindings.secondary_sidebar, self.events.toggle_secondary_sidebar)
        self.bind(self.bindings.directory_tree, self.events.show_directory_tree)
        self.bind(self.bindings.extensions, self.events.show_extensions)
        self.bind(self.bindings.global_search, self.events.show_search)
        self.bind(self.bindings.debugger, self.events.show_debugger)
        self.bind(self.bindings.git, self.events.show_source_control)
        self.bind(self.bindings.assistant, self.events.show_assistant)
        self.bind(self.bindings.logs, self.events.show_logs)

        self.bind(self.bindings.open_settings, self.events.open_settings)
        self.bind(
            self.bindings.restore_recent_session, self.events.restore_recent_session
        )
        self.bind(self.bindings.open_recent_folders, self.events.show_recent_folders)
        self.bind(self.bindings.open_recent_files, self.events.show_recent_files)
        self.bind(
            self.bindings.open_recent_session, self.events.restore_last_closed_editor
        )

    def bind(self, this, to_this) -> None:
        self.base.bind(this, to_this)
