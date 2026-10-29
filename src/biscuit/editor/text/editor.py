from __future__ import annotations

import tkinter as tk
import typing
from hashlib import md5

from biscuit.common.icons import Icons
from biscuit.common.ui import Scrollbar

from ..editorbase import BaseEditor
from .linenumbers import LineNumbers
from .menu import RunMenu
from .minimap import Minimap
from .sticky_scroll import StickyScrollHeader
from .text import Text

if typing.TYPE_CHECKING:
    from tkinter.font import Font

    from biscuit.debugger.base import DebuggerBase
    from biscuit.editor.editor import Editor


class TextEditor(BaseEditor):
    def __init__(
        self,
        master: Editor,
        path="",
        exists=True,
        language="",
        minimalist=False,
        standalone=False,
        load_file=True,
        *args,
        **kwargs,
    ) -> None:
        super().__init__(master, path, exists, *args, **kwargs)
        self.font: Font = self.base.settings.font
        self.path = path
        self.exists = exists
        self.standalone = standalone
        self.minimalist = minimalist or self.standalone
        self.language = language
        self.editable = True
        self.run_command_value = ""
        self.debugger: DebuggerBase = None
        self.runmenu = None
        self.unsupported = False
        self.content_hash = ""
        self.cursor_history: list[str] = []
        self.cursor_history_index: int = -1
        self._minimap_redraw_job = None
        self._text_refresh_job = None
        self._fold_update_job = None
        self._scope_update_job = None
        self._linenumbers_redraw_job = None
        self._sticky_scroll_update_job = None
        self._minimap_update_job = None
        self._indent_guides_update_job = None
        self._whitespace_update_job = None

        if not self.standalone:
            self.__buttons__ = [
                (Icons.REFRESH, self.base.editorsmanager.reopen_active_editor),
            ]

        self.rowconfigure(0, weight=1)
        self.columnconfigure(1, weight=1)

        self.linenumbers = LineNumbers(self)
        self.scrollbar = Scrollbar(self, orient=tk.VERTICAL, style="EditorScrollbar")

        if not self.minimalist:
            self.minimap = Minimap(self)
            self.minimap.grid(row=0, column=2, sticky=tk.NS)

        self.text = Text(
            self,
            path=self.path,
            exists=self.exists,
            minimalist=self.minimalist,
            standalone=self.standalone,
            language=self.language,
        )
        self.language = self.text.language

        if self.exists:
            if load_file:
                self.text.load_file()

            self.text.update_idletasks()

            if not self.standalone:
                self.run_command_value = self.base.execution_manager.get_command(self)
                self.__buttons__.insert(
                    0,
                    {
                        "icon": Icons.PLAY,
                        "event": lambda: self.run_file(),
                        "width": 1,
                        "hfg_only": True,
                    },
                )

                self.runmenu = RunMenu(self, "run menu")
                if self.run_command_value:
                    self.runmenu.add_command(
                        f"Run {self.language} file", lambda: self.run_file()
                    )
                    self.runmenu.add_separator()
                self.runmenu.add_command(
                    "Run in dedicated terminal", lambda: self.run_file(dedicated=True)
                )
                self.runmenu.add_command(
                    "Run in external console", lambda: self.run_file(external=True)
                )
                self.runmenu.add_separator()
                self.runmenu.add_command(
                    "Configure Run...",
                    lambda: self.base.commands.show_run_config_palette(
                        self.run_command_value
                    ),
                )

                self.__buttons__.insert(
                    1,
                    {
                        "icon": Icons.CHEVRON_DOWN,
                        "event": self.runmenu.show,
                        "iconsize": 6,
                        "width": 1,
                    },
                )

                self.debugger = self.base.debugger_manager.request_debugger_for_editor(
                    self
                )
                if self.debugger:
                    self.__buttons__.insert(2, (Icons.DEBUG_ALT, self.run_debugger))
                    self.runmenu.add_separator()
                    self.runmenu.add_command(
                        f"Debug {self.language} file", self.run_debugger
                    )

                    if self.path in self.debugger.breakpoints:
                        self.linenumbers.breakpoints = self.debugger.breakpoints[
                            self.path
                        ]
                        self.linenumbers.redraw()

        self.linenumbers.attach(self.text)
        if not self.minimalist:
            self.minimap.attach(self.text)
        self.sticky_scroll = StickyScrollHeader(self, self.text)
        self.scrollbar.config(command=self.text.yview)

        self.text.config(font=self.font)
        self.text.configure(yscrollcommand=self.scrollbar.set)

        self.linenumbers.grid(row=0, column=0, sticky=tk.NS)
        self.text.grid(row=0, column=1, sticky=tk.NSEW)
        self.scrollbar.grid(row=0, column=3, sticky=tk.NS)

        self.text.bind("<<Change>>", self.on_change)
        self.text.bind("<<Scroll>>", self.on_scroll)

        self.on_change()
        self.on_scroll()

        if self.base.settings.config.auto_save_enabled:
            self.auto_save()

    def run_debugger(self) -> None:
        if self.debugger:
            self.debugger.launch_standalone(self)

    def update_breakpoints(self, breakpoints: set[int]) -> None:
        if self.debugger:
            self.debugger.update_breakpoints(self.path, breakpoints)

    def __getattr__(self, name) -> typing.Any:
        """For methods that are not in this class, assume it is present in Text widget
        and delegate the call to the `Text` widget."""

        text_methods = set(dir(self.text))
        if name in text_methods:
            attr = getattr(self.text, name)
            if self.editable:
                return attr
            else:
                return lambda *args, **kwargs: None
        raise AttributeError(
            f"'{self.__class__.__name__}' object has no attribute '{name}'"
        )

    def file_loaded(self) -> None:
        self.recalculate_content_hash()
        self.event_generate("<<FileLoaded>>", when="tail")
        self.text.event_generate("<<FileLoaded>>", when="tail")

    def recalculate_content_hash(self) -> None:
        """Recalculate the hash of the editor content"""
        self.content_hash = self.calculate_content_hash()

    def calculate_content_hash(self) -> str | None:
        """Calculate the hash of the editor content"""
        if self.exists and self.editable:
            text = self.text.get_all_text()
            return md5(text.encode()).hexdigest()

    @property
    def breakpoints(self):
        return self.linenumbers.breakpoints

    @property
    def unsaved_changes(self):
        """Check if the editor content has changed"""
        if self.editable:
            if not self.content_hash:
                return False

            return self.content_hash != self.calculate_content_hash()

    def run_file(self, dedicated=False, external=False) -> None:
        if not self.run_command_value:
            self.base.notifications.warning(
                "No programs are configured to run this file."
            )
            self.base.commands.show_run_config_palette(self.run_command_value)
            return

        self.save()

        # add another dedicated terminal if there is an active terminal
        if self.base.terminalmanager.active_terminal and dedicated:
            self.base.terminalmanager.add_default_terminal()

        if not external:
            self.base.panel.show_terminal()
        self.base.execution_manager.run_command(self, external=external)

    def set_run_command(self, command) -> None:
        self.run_command_value = command
        self.run_file()

    def on_change(self, *_) -> None:
        if hasattr(self, "linenumbers"):
            self.linenumbers.redraw()
            self._schedule_fold_update()
        if hasattr(self, "sticky_scroll"):
            self._schedule_scope_update()
        try:
            if not self.standalone:
                self.base.update_statusbar()
        except ValueError:
            pass
        self._schedule_text_refresh()
        if not self.minimalist:
            self.minimap.redraw_cursor()
            self.minimap.mark_dirty()
            self._schedule_minimap_redraw()
        self.record_cursor_position()
        self.event_generate("<<Change>>")

    def _schedule_text_refresh(self) -> None:
        """Coalesce expensive highlighting while the user is typing."""
        self.cancel_text_refresh()
        self._text_refresh_job = self.after(120, self._refresh_text)

    def cancel_text_refresh(self) -> None:
        """Cancel a pending debounced text refresh, if any."""
        if self._text_refresh_job is not None:
            try:
                self.after_cancel(self._text_refresh_job)
            except Exception:
                pass
            self._text_refresh_job = None

    def _refresh_text(self) -> None:
        """Run the debounced text refresh if the editor still exists."""
        self._text_refresh_job = None
        try:
            if not self.winfo_exists():
                return
            self.text.refresh()
        except Exception:
            pass

    def _schedule_fold_update(self) -> None:
        """Debounce expensive fold computation while the user is typing."""
        if self._fold_update_job is not None:
            try:
                self.after_cancel(self._fold_update_job)
            except Exception:
                pass
        self._fold_update_job = self.after(150, self._update_folds)

    def _update_folds(self) -> None:
        """Run the debounced fold update if the editor still exists."""
        self._fold_update_job = None
        try:
            if not self.winfo_exists():
                return
            if hasattr(self, "linenumbers"):
                self.linenumbers.update_folds()
        except Exception:
            pass

    def _schedule_scope_update(self) -> None:
        """Debounce expensive sticky scroll scope computation."""
        if self._scope_update_job is not None:
            try:
                self.after_cancel(self._scope_update_job)
            except Exception:
                pass
        self._scope_update_job = self.after(150, self._update_scopes)

    def _update_scopes(self) -> None:
        """Run the debounced scope update if the editor still exists."""
        self._scope_update_job = None
        try:
            if not self.winfo_exists():
                return
            if hasattr(self, "sticky_scroll"):
                self.sticky_scroll.update_scopes()
                self.sticky_scroll.update_sticky_headers()
        except Exception:
            pass

<<<<<<< HEAD
    def _schedule_linenumbers_redraw(self) -> None:
        """Debounce expensive line numbers redraw during scroll."""
        if self._linenumbers_redraw_job is not None:
            try:
                self.after_cancel(self._linenumbers_redraw_job)
            except Exception:
                pass
        self._linenumbers_redraw_job = self.after(50, self._redraw_linenumbers)

    def _redraw_linenumbers(self) -> None:
        """Run the debounced line numbers redraw if the editor still exists."""
        self._linenumbers_redraw_job = None
        try:
            if not self.winfo_exists():
                return
            if hasattr(self, "linenumbers"):
                self.linenumbers.redraw()
        except Exception:
            pass

    def _schedule_sticky_scroll_update(self) -> None:
        """Debounce sticky scroll update during scroll."""
        if self._sticky_scroll_update_job is not None:
            try:
                self.after_cancel(self._sticky_scroll_update_job)
            except Exception:
                pass
        self._sticky_scroll_update_job = self.after(50, self._update_sticky_scroll)

    def _update_sticky_scroll(self) -> None:
        """Run the debounced sticky scroll update if the editor still exists."""
        self._sticky_scroll_update_job = None
        try:
            if not self.winfo_exists():
                return
            if hasattr(self, "sticky_scroll"):
                self.sticky_scroll.update_sticky_headers()
        except Exception:
            pass

    def _schedule_minimap_update(self) -> None:
        """Debounce minimap update during scroll."""
        if self._minimap_update_job is not None:
            try:
                self.after_cancel(self._minimap_update_job)
            except Exception:
                pass
        self._minimap_update_job = self.after(50, self._update_minimap)

    def _update_minimap(self) -> None:
        """Run the debounced minimap update if the editor still exists."""
        self._minimap_update_job = None
        try:
            if not self.winfo_exists():
                return
            if not self.minimalist and hasattr(self, "minimap"):
                self.minimap.update_from_yview(*self.text.yview())
        except Exception:
            pass

    def _schedule_indent_guides_update(self) -> None:
        """Debounce indent guides update during scroll."""
        if self._indent_guides_update_job is not None:
            try:
                self.after_cancel(self._indent_guides_update_job)
            except Exception:
                pass
        self._indent_guides_update_job = self.after(50, self._update_indent_guides)

    def _update_indent_guides(self) -> None:
        """Run the debounced indent guides update if the editor still exists."""
        self._indent_guides_update_job = None
        try:
            if not self.winfo_exists():
                return
            if hasattr(self.text, "update_indent_guides"):
                self.text.update_indent_guides()
        except Exception:
            pass

    def _schedule_whitespace_update(self) -> None:
        """Debounce whitespace update during scroll."""
        if self._whitespace_update_job is not None:
            try:
                self.after_cancel(self._whitespace_update_job)
            except Exception:
                pass
        self._whitespace_update_job = self.after(50, self._update_whitespace)

    def _update_whitespace(self) -> None:
        """Run the debounced whitespace update if the editor still exists."""
        self._whitespace_update_job = None
        try:
            if not self.winfo_exists():
                return
            if hasattr(self.text, "update_whitespace"):
                self.text.update_whitespace()
        except Exception:
            pass

=======
>>>>>>> origin/main
    def record_cursor_position(self, pos: str = None) -> None:
        try:
            if not pos and hasattr(self, "text"):
                pos = self.text.index(tk.INSERT)
            if not pos:
                return
            if not self.cursor_history or self.cursor_history[-1] != pos:
                self.cursor_history.append(pos)
                self.cursor_history_index = len(self.cursor_history) - 1
                if len(self.cursor_history) > 100:
                    self.cursor_history.pop(0)
                    self.cursor_history_index -= 1
        except Exception:
            pass

    def on_scroll(self, *_) -> None:
        if hasattr(self, "linenumbers"):
            self._schedule_linenumbers_redraw()
        if hasattr(self, "sticky_scroll"):
            self._schedule_sticky_scroll_update()
        if not self.minimalist:
            self._schedule_minimap_update()
        if hasattr(self.text, "update_indent_guides"):
            self._schedule_indent_guides_update()
        if hasattr(self.text, "_reposition_blame_label"):
            self.text._reposition_blame_label()
        if hasattr(self.text, "update_whitespace"):
            self._schedule_whitespace_update()
        self.event_generate("<<Scroll>>")

    def _schedule_minimap_redraw(self) -> None:
        """Rebuild the minimap preview after edits settle, not on every event."""
        if self._minimap_redraw_job is not None:
            try:
                self.after_cancel(self._minimap_redraw_job)
            except Exception:
                pass
            self._minimap_redraw_job = None
        self._minimap_redraw_job = self.after(500, self._redraw_minimap)

    def _redraw_minimap(self) -> None:
        """Rebuild the minimap preview if it is still visible."""
        self._minimap_redraw_job = None
        try:
            if not self.winfo_exists() or not self.minimap.winfo_ismapped():
                return
            self.minimap.redraw()
            self.minimap.update_from_yview(*self.text.yview())
        except Exception:
            pass

    def unsupported_file(self) -> None:
        self.unsupported = True
        self.text.show_unsupported_dialog()
        self.linenumbers.grid_remove()
        self.scrollbar.grid_remove()
        self.editable = False

    def focus(self) -> None:
        self.text.focus()
        self.on_change()

    def set_fontsize(self, size) -> None:
        self.font.configure(size=size)
        self.linenumbers.set_bar_width(size * 3)
        self.on_change()

    def save(self, path=None) -> None:
        if self.editable:
            self.recalculate_content_hash()
            self.text.save_file(path)

    def auto_save(self) -> None:
        if self.standalone:
            return

        self.save()
        self.base.after(self.base.settings.config.auto_save_timer_ms, self.auto_save)
