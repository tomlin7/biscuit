import tkinter as tk


class EmptyTab(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.logo_img = tk.PhotoImage(file=self.base.settings.resources.logo).subsample(2)
        self.logo = ttk.Label(self, image=self.logo_img, width=10)
        self.logo.pack(fill=tk.BOTH, expand=False)

        # +------------------+
        # |     +------+     |
        # |     [ logo ]     |
        # |     +------+     |
        # | [some shortcuts] |
        # |                  |
        # +------------------+
