from __future__ import annotations

import tkinter as tk
from hashlib import md5
from tkinter.font import Font

from src.biscuit.common.ui import Scrollbar
from src.biscuit.debugger import get_debugger

from ..editorbase import BaseEditor
from .linenumbers import LineNumbers
from .menu import RunMenu
from .minimap import Minimap
from .text import Text


class TextEditor(BaseEditor):
    def __init__(
        self,
        master,
        path=None,
        exists=True,
        language=None,
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
        self.run_command_value = None
        self.debugger = None
        self.runmenu = None
        self.unsupported = False
        self.content_hash = ""

        if not self.standalone:
            self.__buttons__ = [
                ("refresh", self.base.editorsmanager.reopen_active_editor),
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
                self.__buttons__.insert(0, ("play", lambda: self.run_file()))

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

                self.__buttons__.insert(1, ("chevron-down", self.runmenu.show))

                self.debugger = get_debugger(self)
                if self.debugger:
                    self.__buttons__.insert(2, ("bug", self.debugger.run))
                    self.runmenu.add_separator()
                    self.runmenu.add_command(
                        f"Debug {self.language} file", self.debugger.run
                    )

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

    def __getattr__(self, name):
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

    def file_loaded(self):
        self.recalculate_content_hash()
        print(f"File opened {self.path}")
        self.event_generate("<<FileLoaded>>", when="tail")
        self.text.event_generate("<<FileLoaded>>", when="tail")

    def recalculate_content_hash(self):
        """Recalculate the hash of the editor content"""
        self.content_hash = self.calculate_content_hash()

    def calculate_content_hash(self):
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
            return self.content_hash != self.calculate_content_hash()

    def run_file(self, dedicated=False, external=False):
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

    def set_run_command(self, command):
        self.run_command_value = command
        self.run_file()

    def on_change(self, *_):
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

    def on_scroll(self, *_):
        self.linenumbers.redraw()
        if not self.minimalist:
            self.minimap.redraw()
        self.event_generate("<<Scroll>>")

    def unsupported_file(self):
        self.unsupported = True
        self.text.show_unsupported_dialog()
        self.linenumbers.grid_remove()
        self.scrollbar.grid_remove()
        self.editable = False

    def focus(self):
        self.text.focus()
        self.on_change()

    def set_fontsize(self, size):
        self.font.configure(size=size)
        self.linenumbers.set_bar_width(size * 3)
        self.on_change()

    def save(self, path=None):
        if self.editable:
            self.recalculate_content_hash()
            self.text.save_file(path)

    def auto_save(self):
        if self.standalone:
            return

        self.save()
        self.base.after(self.base.settings.config.auto_save_timer_ms, self.auto_save)
