import tkinter as tk

from lib.settings import Settings
from lib.editor import Editor
from lib.statusbar import SLabel, SButton, StatusBar

class Base:
    def __init__(self, root, *args, **kwargs):
        self.root = root
 
        self.settings = Settings()

        self.editor = Editor(base=self, master=self.root)
        self.statusbar = StatusBar(self.root)

        self.pack_components()

    def pack_components(self):
        self.editor.pack()
        self.statusbar.pack()