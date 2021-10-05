import tkinter as tk

import lib.config as config

from lib.editor import Editor
from lib.statusbar import SLabel, SButton, StatusBar

class Base:
    def __init__(self, root, *args, **kwargs):
        self.root = root

        self.config = config.Config()
        self.bindings = config.Bindings()

        self.editor = Editor(self.root)
        self.statusbar = StatusBar(self.root)

        self.pack_components()

    def pack_components(self):
        self.editor.pack()
        self.statusbar.pack()