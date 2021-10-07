import tkinter as tk

from lib.settings import Settings

class Base:
    def __init__(self, root, *args, **kwargs):
        self.root = root
        self.settings = Settings()
