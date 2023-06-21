#TODO add actual functions to actionset
import tkinter as tk

from .utils.button import SButton
from .utils.clock import SClock

from core.components import ActionSet


class Statusbar(tk.Frame):
    """
    Status bar holds various widgets that are used to display information about the current file
    and the current state of the editor.
    .
    App
    └── Root
        ├── Menubar
        ├── BaseFrame
        └── Statusbar
    """
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.config(bg="#f8f8f8")

        # TODO add a button for toggling panel, left side, "terminal-bash", color

        # git info
        self.git_actionset = ActionSet(
            "GIT", "branch:",
            [("main", lambda e=None: print("main", e)), ("rewrite", lambda e=None: print("rewrite", e))],
        )
        self.base.palette.register_actionset(self.git_actionset)
        self.branch = SButton(self, text="master", icon="\uea68", function=lambda e: self.base.palette.show_prompt('branch:'))
        self.branch.set_pack_data(side=tk.LEFT, padx=(10, 0))

        # line and column info
        self.lc_actionset = ActionSet(
            "GOTO", ":",
            [("goto line", lambda e=None: print("goto line", e))],
        )
        self.base.palette.register_actionset(self.lc_actionset)
        self.line_col_info = SButton(self, text="Ln 1, Col 1", function=lambda e: self.base.palette.show_prompt(':'))
        self.line_col_info.set_pack_data(side=tk.RIGHT)

        # indentation
        self.indent_actionset = ActionSet(
            "INDENT", "indent:",
            [("2", lambda e=None: print("indent 2", e)),
            ("4", lambda e=None: print("indent 2", e))],
        )
        self.base.palette.register_actionset(self.indent_actionset)
        self.indentation = SButton(self, text="Spaces: 4", function=lambda e: self.base.palette.show_prompt('indent:'))
        self.indentation.set_pack_data(side=tk.RIGHT)

        # encoding
        self.encoding_actionset = ActionSet(
            "ENCODING", "encoding:",
            [("UTF-8", lambda e=None: print("encoding UTF-8", e))],
        )
        self.base.palette.register_actionset(self.encoding_actionset)
        self.encoding = SButton(self, text="UTF-8", function=lambda e: self.base.palette.show_prompt('encoding:'))
        self.encoding.set_pack_data(side=tk.RIGHT)

        # end of line
        self.eol_actionset = ActionSet(
            "EOL", "eol:",
            [("LF", lambda e=None: print("eol lf", e)),
            ("CRLF", lambda e=None: print("eol crlf", e))],
        )
        self.base.palette.register_actionset(self.eol_actionset)
        self.eol = SButton(self, text="CRLF", function=lambda e: self.base.palette.show_prompt('eol:'))
        self.eol.set_pack_data(side=tk.RIGHT)

        # TODO use pyglet
        self.filetype_actionset = ActionSet(
            "FILETYPE", "syntax:",
            [("Plain Text", lambda e=None: print("filetype Plain Text", e)),
            ("python", lambda e=None: print("filetype python", e)),
            ("c++", lambda e=None: print("filetype c++", e))],
        )
        self.base.palette.register_actionset(self.filetype_actionset)
        self.file_type = SButton(self, text="Plain Text", function=lambda e: self.base.palette.show_prompt('syntax:'))
        self.file_type.set_pack_data(side=tk.RIGHT)

        self.clock = SClock(self, text="H:M:S")
        self.clock.set_pack_data(side=tk.RIGHT, padx=(0, 10))

        # packing
        self.clock.show()
    
    def toggle_editmode(self, state):
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
    
    def configure_git_info(self, state):
        if state:
            self.branch.show()
        else:
            self.branch.hide()
        
    def set_git_info(self, branch):
        self.branch.change_text("{0}".format(branch))

    def set_line_col_info(self, line, col, selected):
        self.line_col_info.change_text(text="Ln {0}, Col {1}{2}".format(line, col, f" ({selected} selected)" if selected else ""))
