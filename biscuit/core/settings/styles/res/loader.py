import os
import tkinter as tk
import tksvg


class ResourcesLoader:
    def __init__(self, master):
        self.base = master.base

    def load_image(self, path):
        return tk.PhotoImage(file=os.path.join(self.base.configdir, path))

    def load_svg(self, path):
        return tksvg.SvgImage(file=os.path.join(self.base.resdir, path))