import tkinter as tk

from lib.components.git.core import GitCore
from lib.components.git.repo import GitRepo

from lib.components.text import utils

# TODO: change into git pane later on
class GitWindow(tk.Toplevel):
    def __init__(self, master, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.base = master
        
        self.core = self.base.git
        self.init_window()
        self.init_widgets()

    def init_window(self):
        self.title("Bisgit")
        self.geometry("400x400")

    def init_widgets(self):
        self.lbl = tk.Label(self, text=f"branch: {self.core.get_active_branch()}")
