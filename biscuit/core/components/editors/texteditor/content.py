import os
import tkinter as tk

from .binder import Binder
from .linenumbers import LineNumbers

from ...text import Text
from ..image_viewer import ImageViewer
from ...placeholders.welcome import WelcomePage
from ...text.utils import Utils
from ...utils import AutoScrollbar
from ...utils import FileType

class EditorContent(tk.Frame):
    def __init__(self, master, path=None, exists=True, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master
        self.path = path
        self.exists = exists
        
        self.show_path = True
        self.editable = True

        if os.path.isfile(path):
            if FileType.is_image(path):
                self.open_image_viewer()
            else:
                self.open_text_editor()
        else:
            if path == "@welcomepage":
                self.open_welcome_tab()
            else:
                self.open_text_editor()
        
    def open_welcome_tab(self):
        self.rowconfigure(0, weight=1)
        self.columnconfigure(0, weight=1)

        self.welcome_page = WelcomePage(self)
        self.welcome_page.grid(row=0, column=0, sticky=tk.NSEW)
        self.editable = False
        self.show_path = False
    
    def open_image_viewer(self):
        self.rowconfigure(0, weight=1)
        self.columnconfigure(0, weight=1)

        self.image = ImageViewer(self, self.path)
        self.image.grid(row=0, column=0, sticky=tk.NSEW)
        self.editable = False
    
    def open_text_editor(self):
        # self.font = self.base.settings.font
        self.font = self.base.settings.font
        
        # self.zoom = self.font["size"]

        self.rowconfigure(0, weight=1)
        self.columnconfigure(1, weight=1)

        self.text = Text(master=self, path=self.path, exists=self.exists)
        self.text.config(font=self.font)
        self.linenumbers = LineNumbers(master=self, text=self.text)

        self.scrollbar = AutoScrollbar(self, orient=tk.VERTICAL, command=self.text.yview)
        self.text.configure(yscrollcommand=self.scrollbar.set)

        self.linenumbers.grid(row=0, column=0, sticky=tk.NS)
        self.text.grid(row=0, column=1, sticky=tk.NSEW)
        self.scrollbar.grid(row=0, column=2, sticky=tk.NS)

        if self.exists:
            self.text.load_file()

        self.text.bind("<<Change>>", self._on_change)
        self.text.bind("<Configure>", self._on_change)

    def unsupported_file(self):
        self.text.show_unsupported_dialog()
        self.linenumbers.grid_remove()
        self.scrollbar.grid_remove()
        self.editable = False
        self.base.root.statusbar.configure_editmode(False)

    def _on_change(self, event=None):
        self.linenumbers.redraw()
        self.base.update_statusbar_ln_col_info()
    
    def set_fontsize(self, size):
        self.font.configure(size=size)
        self.linenumbers.set_bar_width(size * 3)
        self._on_change()

    def refresh_fontsize(self):
        self.set_fontsize(self.zoom)
        self._on_change()
    
    def cut(self, *_):
        if self.editable:
            self.text.cut()
    
    def copy(self, *_):
        if self.editable:
            self.text.copy()
        
    def paste(self, *_):
        if self.editable:
            self.text.paste()
