import json, os
import tkinter as tk


class ResourcesLoader:
    def __init__(self, master):
        self.base = master.base

    def load_image(self, resource):
        return tk.PhotoImage(file=self.base.get_res_path(resource))
