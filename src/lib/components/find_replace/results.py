import tkinter as tk


class FindResults(tk.Label):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.init()
        self.config(padx=1, width=10, font=("Helvetica", 10), bg="#f3f3f3")

    def show(self, n):
        if not n:
            self.config(text="No results")
            self.config(fg="#a1260d")
        else:
            self.config(text=f"{n} results")
        
    def init(self):
        self.config(text="No results")
        self.config(fg="#616161")