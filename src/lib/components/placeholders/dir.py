import tkinter as tk

from ..utils import WrappingLabel


class DirtreePlaceholder(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.config(bd=0, relief=tk.FLAT, bg="#f3f3f3")
        self.columnconfigure(0, weight=1)

        self.not_opened_dialog = WrappingLabel(self)
        self.not_opened_dialog.config(
            text="You have not yet opened a folder.", font=("Segoe UI", 10), 
            anchor=tk.W, justify=tk.LEFT, fg="#616161", bg="#f3f3f3")
        self.not_opened_dialog.grid(row=0, pady=2, sticky=tk.EW)

        self.open_btn = tk.Menubutton(self)
        self.open_btn.config(
            text="Open Folder", bg="#007acc", fg="#ffffff", 
            activebackground="#0062a3", activeforeground="#ffffff",
            font=("Segoe UI", 10), pady=3)
        self.open_btn.bind("<Button-1>", self.open_folder)
        self.open_btn.grid(row=1, pady=5, sticky=tk.EW)

    def open_folder(self, *_):
        self.base.events.open_dir()
