import tkinter as tk


class DiffViewerPane(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master

        self.rowconfigure(0, weight=1)
        self.columnconfigure(0, weight=1)

        self.text = tk.Text(self)
        self.text.grid(row=0, column=0, sticky=tk.NSEW)
