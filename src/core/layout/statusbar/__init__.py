import tkinter as tk 

from .utils.label import SLabel
from .utils.button import SButton
from .utils.clock import SClock

from .popups.eol import EOLPopup
from .popups.encoding import EncodingPopup
from .popups.filetype import FileTypePopup
from .popups.git import GitPopup
from .popups.indentation import IndentationPopup
from .popups.linecolinfo import LineColInfoPopup

class StatusBar(tk.Frame):
    """
    Status bar holds various widgets that are used to display information about the current file
    and the current state of the editor.
    .
    App
    └── Root
        ├── Menubar
        ├── MainFrame
        └── StatusBar
    """
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.fg = "#ffffff"
        self.bg = "#007acc"
        self.hbg = "#1f8ad2"
        self.config(bg=self.bg)

        # git info
        self.git_popup = GitPopup(self)
        self.branch = SButton(self, text="master", icon="\uea68", function=self.git_popup.show)
        self.branch.set_pack_data(side=tk.LEFT, padx=(10, 0))

        # line and column info
        # self.line_col_info_popup = LineColInfoPopup(self)
        self.line_col_info = SButton(self, text="Ln 1, Col 1")
        self.line_col_info.set_pack_data(side=tk.RIGHT)

        # indentation
        self.indentation_popup = IndentationPopup(self)
        self.indentation = SButton(self, text="Spaces: 4", function=self.indentation_popup.show)
        self.indentation.set_pack_data(side=tk.RIGHT)

        # encoding
        self.encoding_popup = EncodingPopup(self)
        self.encoding = SButton(self, text="UTF-8", function=self.encoding_popup.show)
        self.encoding.set_pack_data(side=tk.RIGHT)

        # end of line
        self.eol_popup = EOLPopup(self)
        self.eol = SButton(self, text="CRLF", function=self.eol_popup.show)
        self.eol.set_pack_data(side=tk.RIGHT)

        # file type
        self.file_type_popup = FileTypePopup(self)
        self.file_type = SButton(self, text="Plain Text", function=self.file_type_popup.show)
        self.file_type.set_pack_data(side=tk.RIGHT)

        self.clock = SClock(self, text="H:M:S")
        self.clock.set_pack_data(side=tk.RIGHT, padx=(0, 10))

        # packing
        self.clock.show()
    
    def configure_editmode(self, enabled):
        if enabled:
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
    
    def configure_git_info(self, enabled):
        if enabled:
            self.branch.show()
        else:
            self.branch.hide()
        
    def set_git_info(self, branch):
        self.branch.change_text("{0}".format(branch))

    def set_line_col_info(self, line, col, selected):
        self.line_col_info.change_text(text="Ln {0}, Col {1}{2}".format(line, col, f" ({selected} selected)" if selected else ""))