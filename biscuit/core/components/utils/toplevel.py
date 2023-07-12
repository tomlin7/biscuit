import tkinter as tk


class Toplevel(tk.Toplevel):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

    def geometry_size(self, width=None, height=None):
        app_width = round(width * self.base.scale)
        app_height = round(height * self.base.scale)
        self.geometry(f"{app_width}x{app_height}")
