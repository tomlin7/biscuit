import tkinter as tk


class WelcomePage(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.config(padx=50, pady=50)

        self.title = tk.Label(self, text="Biscuit", font=("Helvetica", 50))
        self.title.pack()
