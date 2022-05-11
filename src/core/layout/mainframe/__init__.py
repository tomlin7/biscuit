import tkinter as tk
from tkinter.constants import *

from .basepane import BasePane
from ...components import ActionBar


class MainFrame(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.actionbar = ActionBar(self)
        self.basepane = BasePane(master=self)

        self.actionbar.pack(side=RIGHT, fill=Y)
        self.basepane.pack(fill=BOTH, expand=1, side=RIGHT)
