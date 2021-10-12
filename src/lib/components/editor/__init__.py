import tkinter as tk
import tkinter.font as Font

from lib.components.text import Text
from lib.components.text.utils import Utils

from lib.components.editor.utils.linenumbers import LineNumbers
from lib.components.editor.utils.binder import Binder

class Editor(tk.Frame):
    def __init__(self, master, path=None, exists=True, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master

        # self.font = self.base.settings.font
        self.configured_font = self.base.settings.font
        self.font = tk.font.Font(
            family=self.configured_font['family'], 
            size=self.configured_font['size'], 
            weight=self.configured_font['weight'])
        
        self.zoom = self.font["size"]

        self.text = Text(master=self, path=path, exists=exists)
        self.linenumbers = LineNumbers(master=self, text=self.text)

        self.scrollbar = tk.Scrollbar(self, orient="vertical", command=self.text.yview)
        self.text.configure(yscrollcommand=self.scrollbar.set)

        self.scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.linenumbers.pack(side=tk.LEFT, fill=tk.Y)
        self.text.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)
        
        self.binder = Binder(self)
        self.binder.bind_all()

    def _on_change(self, event=None):
        self.linenumbers.redraw()
    
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
