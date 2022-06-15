import tkinter as tk

from ..utils import WrappingLabel


class GitPlaceHolder(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.config(bd=0, relief=tk.FLAT)
        self.columnconfigure(0, weight=1)

        self.open_clone_dialog = WrappingLabel(self)
        self.open_clone_dialog.config(
            text="In order to use git features, you can open a folder containing a git repository or clone from a URL.", 
            font=("Segoe UI", 12), anchor=tk.W, justify=tk.LEFT, fg="#616165")
        self.open_clone_dialog.grid(row=0, pady=5, sticky=tk.EW)

        self.open_btn = tk.Menubutton(self)
        self.open_btn.config(
            text="Open Folder", bg="#0e639c", fg="#ffffff", 
            activebackground="#1177bb", activeforeground="#ffffff",
            font=("Segoe UI", 12), pady=5)
        self.open_btn.bind("<Button-1>", self.open_folder)
        self.open_btn.grid(row=1, pady=6, sticky=tk.EW)

    def open_folder(self, _):
        self.base.events.open_dir()
