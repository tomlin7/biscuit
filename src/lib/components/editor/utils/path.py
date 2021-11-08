import tkinter as tk


class Path(tk.Label):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        
        self.pathvar = tk.StringVar()
        self.pathvar.set(self.master.path)

        self.config(anchor=tk.W, textvariable=self.pathvar, bg="#6c6c6c", fg="#ffffff")