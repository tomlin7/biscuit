"""
Statusbar and the further info shown on statusbar
    .
    App
    └── Root
        ├── Menubar
        ├── BaseFrame
        └── Statusbar
"""
#TODO add actual functions to actionset
from __future__ import annotations

import tkinter as tk
import typing

from pygments.lexers._mapping import LEXERS

from biscuit.core.components import ActionSet
from biscuit.core.components.utils import Frame

from .utils.button import SButton, TerminalButton
from .utils.clock import SClock

if typing.TYPE_CHECKING:
    from ...components.editors.texteditor import Text
    from .. import Root


class Statusbar(Frame):
    """
    Status bar holds various widgets that are used to display information about the current file
    and the current state of the editor.

    Attributes
    ----------
    base : Root
        Root window
    """

    def __init__(self, master: Root, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.layout.statusbar.background)

        # TODO add a button for toggling panel, left side, "terminal-bash", color
        self.branch = TerminalButton(self, icon="terminal-bash", function=self.toggle_terminal, description="Toggle terminal", padx=10)
        self.branch.pack(side=tk.LEFT)

        # git info
        self.git_actionset = ActionSet(
            "Manage git branches", "branch:",  #TODO pinned `create new branch` item
            [("main", lambda e=None: print("main", e)), 
             ("rewrite", lambda e=None: print("rewrite", e))],
        )
        self.base.palette.register_actionset(lambda: self.git_actionset)
        self.branch = SButton(self, text="master", icon="source-control", function=lambda: self.base.palette.show_prompt('branch:'), description="Checkout branch")
        self.branch.set_pack_data(side=tk.LEFT, padx=(2, 0))

        # line and column info
        self.lc_actionset = ActionSet(
            "Goto line in active editor", ":", pinned=[["goto line: {}", lambda line=None: self.base.editorsmanager.active_editor.content.goto(int(line)) if line and line.isnumeric() else print("failed goto line", line)]]
        )
        self.base.palette.register_actionset(lambda: self.lc_actionset)
        self.line_col_info = SButton(self, text="Ln 1, Col 1", function=lambda: self.base.palette.show_prompt(':'), description="Go to Line/Column")
        self.line_col_info.set_pack_data(side=tk.RIGHT)

        # indentation
        self.indent_actionset = ActionSet(
            "Change indentation", "indent:",
            [("2", lambda e=None: print("indent 2", e)),
            ("4", lambda e=None: print("indent 2", e))],
        )
        self.base.palette.register_actionset(lambda: self.indent_actionset)
        self.indentation = SButton(self, text="Spaces: 4", function=lambda: self.base.palette.show_prompt('indent:'), description="Select indentation")
        self.indentation.set_pack_data(side=tk.RIGHT)

        # encoding
        self.encoding_actionset = ActionSet(
            "Change file encoding", "encoding:",
            [("UTF-8", lambda e=None: print("encoding UTF-8", e))],
        )
        self.base.palette.register_actionset(lambda: self.encoding_actionset)
        self.encoding = SButton(self, text="UTF-8", function=lambda: self.base.palette.show_prompt('encoding:'), description="Select encoding")
        self.encoding.set_pack_data(side=tk.RIGHT)

        # end of line
        self.eol_actionset = ActionSet(
            "Change End of Line sequence", "eol:",
            [("LF", lambda e=None: print("eol lf", e)),
            ("CRLF", lambda e=None: print("eol crlf", e))],
        )
        self.base.palette.register_actionset(lambda: self.eol_actionset)
        self.eol = SButton(self, text="CRLF", function=lambda: self.base.palette.show_prompt('eol:'), description="Select End of Line sequence")
        self.eol.set_pack_data(side=tk.RIGHT)

        # language mode
        items = [(aliases[0], lambda _, lang=aliases[0]: self.base.editorsmanager.active_editor.content.text.highlighter.change_language(lang)) for _, _, aliases, _, _ in LEXERS.values() if aliases]
        self.language_actionset = ActionSet(
            "Change Language Mode", "language:", items
        )
        self.base.palette.register_actionset(lambda: self.language_actionset)
        self.file_type = SButton(self, text="Plain Text", function=lambda: self.base.palette.show_prompt('language:'), description="Select Language Mode")
        self.file_type.set_pack_data(side=tk.RIGHT)

        # show/hide notifications
        self.notif = SButton(self, icon="bell", function=self.base.notifications.show, description="No notifications")
        self.notif.pack(side=tk.RIGHT, padx=(0, 10))

        # clock
        self.time_actionset = ActionSet(
            "Configure clock format", "time:",
            [("12 hours", lambda e=None: print("time 12 hours", e)),
            ("24 hours", lambda e=None: print("time 24 hours", e)),],
        )
        self.clock = SClock(self, text="H:M:S", function=lambda: self.base.palette.show_prompt('time:'), description="Time")
        self.clock.set_pack_data(side=tk.RIGHT)
        self.clock.show()

    def toggle_terminal(self) -> None:
        self.base.toggle_terminal()

    def toggle_editmode(self, state: bool) -> None:
        if state:
            self.clock.show()
            self.file_type.show()
            self.eol.show()
            self.encoding.show()
            self.indentation.show()
            self.line_col_info.show()
        else:
            self.file_type.hide()
            self.eol.hide()
            self.encoding.hide()
            self.indentation.hide()
            self.line_col_info.hide()
    
    def update_git_info(self) -> None:
        if self.base.git_found:
            self.branch.show()
            self.branch.change_text("{0}".format(self.base.git.active_branch))
            self.git_actionset.update([(str(branch), lambda e=None: self.base.git.checkout(str(branch))) for branch in self.base.git.repo.branches])
        else:
            self.branch.hide()
    
    def on_open_file(self, text: Text) -> None:
        self.file_type.change_text(text.language)
        self.encoding.change_text(text.encoding)
        self.eol.change_text(text.eol)
    
    def update_notifications(self) -> None:
        if n := self.base.notifications.count:
            self.notif.change_icon('bell-dot')
            self.notif.change_description(f'{n} notifications')
        else:
            self.notif.change_icon('bell')
            self.notif.change_description(f'No notifications')

    def set_line_col_info(self, line: int, col: int, selected: int) -> None:
        self.line_col_info.change_text(text="Ln {0}, Col {1}{2}".format(line, col, f" ({selected} selected)" if selected else ""))

    def set_encoding(self, encoding: str) -> None:
        self.encoding.change_text(text=encoding.upper())
