import tkinter as tk 

from .utils.label import SLabel
from .utils.button import SButton
from .utils.clock import SClock

from .popups.eol import EOLPopup
from .popups.encoding import EncodingPopup
from .popups.filetype import FileTypePopup
from .popups.git import GitPopup

class StatusBar(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        # git info
        self.branch = SButton(self, text=" master")
        self.branch.set_pack_data(side=tk.LEFT)
        self.git_popup = GitPopup(self)
        self.branch.bind("<Button-1>", self.git_popup.show)

        self.line_col_info = SButton(self, text="Ln ?, Col ?")
        self.line_col_info.set_pack_data(side=tk.RIGHT)

        # encoding
        self.encoding = SButton(self, text="UTF-8")
        self.encoding.set_pack_data(side=tk.RIGHT)
        self.encoding_popup = EncodingPopup(self)
        self.encoding.bind("<Button-1>", self.encoding_popup.show)

        # end of line
        self.eol = SButton(self, text="CRLF")
        self.eol.set_pack_data(side=tk.RIGHT)
        self.eol_popup = EOLPopup(self)
        self.eol.bind("<Button-1>", self.eol_popup.show)

        # file type
        self.file_type = SButton(self, text="Plain Text")
        self.file_type.set_pack_data(side=tk.RIGHT)
        self.file_type_popup = FileTypePopup(self)
        self.file_type.bind("<Button-1>", self.file_type_popup.show)

        self.clock = SClock(self, text="H:M:S")
        self.clock.set_pack_data(side=tk.RIGHT)
        

        self.branch.show()
    
        self.clock.show()
        self.file_type.show()
        self.eol.show()
        self.encoding.show()
        self.line_col_info.show()
    
    def configure_editmode(self, enabled):
        if enabled:
            #if not self.line_col_info.enabled:
            self.clock.show()
            self.file_type.show()
            self.eol.show()
            self.encoding.show()
            self.line_col_info.show()
        else:
            #if self.line_col_info.enabled:
            self.file_type.hide()
            self.eol.hide()
            self.encoding.hide()
            self.line_col_info.hide()
    
    def configure_git_info(self, enabled):
        if enabled:
            if not self.branch.enabled:
                self.branch.show()
        else:
            if self.branch.enabled:
                self.branch.hide()
        
    def set_git_info(self, branch):
        self.branch.config(text=" {0}".format(branch))

    def set_line_col_info(self, line, col, selected):
        self.line_col_info.config(text="Ln {0}, Col {1}{2}".format(line, col, f" ({selected} selected)" if selected else ""))