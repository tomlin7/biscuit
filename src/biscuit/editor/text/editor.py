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
        self.linenumbers.redraw()
        try:
            if not self.standalone:
                self.base.update_statusbar()
        except ValueError:
            pass
        self.text.refresh()
        if not self.minimalist:
            self.minimap.redraw_cursor()
        self.event_generate("<<Change>>")

    def on_scroll(self, *_) -> None:
        self.linenumbers.redraw()
        if not self.minimalist:
            self.minimap.redraw()
        self.event_generate("<<Scroll>>")

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
