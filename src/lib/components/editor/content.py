import tkinter as tk
import tkinter.font as Font

from ..text import Text
from ..text.utils import Utils

from .utils.binder import Binder
from .utils.linenumbers import LineNumbers
from ..utils.scrollbar import AutoScrollbar

class EditorContent(tk.Frame):
    def __init__(self, master, path=None, exists=True, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master
        self.path = path

        # self.font = self.base.settings.font
        self.configured_font = self.base.settings.font
        self.font = tk.font.Font(
            family=self.configured_font['family'], 
            size=self.configured_font['size'], 
            weight=self.configured_font['weight'])
        
        self.zoom = self.font["size"]

        self.text = Text(master=self, path=path, exists=exists)
        self.linenumbers = LineNumbers(master=self, text=self.text)

        self.scrollbar = AutoScrollbar(self, orient=tk.VERTICAL, command=self.text.yview)
        self.text.configure(yscrollcommand=self.scrollbar.set)

        self.rowconfigure(0, weight=1)
        self.columnconfigure(1, weight=1)

        self.linenumbers.grid(row=0, column=0, sticky=tk.NS)
        self.text.grid(row=0, column=1, sticky=tk.NSEW)
        self.scrollbar.grid(row=0, column=2, sticky=tk.NS)
        
        self.binder = Binder(self)
        self.binder.bind_all()

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
    
    def handle_zoom(self, event):
        if 5 <= self.zoom <= 50:
            if event.delta < 0:
                self.zoom -= 1
            else:
                self.zoom += 1
        self.zoom = Utils.clamp(self.zoom, 5, 50)
        
        self.refresh_fontsize()
        return "break"
