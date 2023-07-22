import os
import tkinter as tk

import tksvg


class ResourcesLoader:
    def __init__(self, master):
        self.base = master.base
    
    def get_res_path(self, path):
        return os.path.join(self.base.resdir, path)

    def load_image(self, path):
        return tk.PhotoImage(file=self.get_res_path(path))

    def load_svg(self, path):
        return tksvg.SvgImage(file=self.get_res_path(path))
