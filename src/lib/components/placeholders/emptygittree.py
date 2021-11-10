import tkinter as tk
from tkinter import ttk

from ..utils.label import WrappingLabel


class EmptyGitTree(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.config(bd=0, relief=tk.FLAT)
        self.columnconfigure(0, weight=1)

        self.open_clone_dialog = WrappingLabel(self)
        self.open_clone_dialog.config(
            text="In order to use git features, you can open a folder containing a git repository or clone from a URL.", 
            font=("Helvetica", 13), anchor=tk.W, justify=tk.LEFT)
        self.open_clone_dialog.grid(row=0, pady=10, sticky=tk.EW)

        self.open_btn = tk.Menubutton(self)
        self.open_btn.config(
            text="Open Folder", bg="#0e639c", fg="#ffffff", 
            activebackground="#1177bb", activeforeground="#ffffff",
            font=("Helvetica", 13), pady=10)
        self.open_btn.grid(row=1, pady=10, sticky=tk.EW)
