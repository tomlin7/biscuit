import tkinter as tk


class FindResults(tk.Label):
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.init()
        self.config(padx=1, width=10, font=("Helvetica", 10), **self.base.theme.findreplace.label)

    def show(self, n):
        if not n:
            self.config(text="No results")
            self.config(fg="#f48771")
        else:
            self.config(text=f"{n} results")
            self.config(fg=self.base.theme.findreplace.label.foreground)
        
    def init(self):
        self.config(text="No results")
        self.config(fg=self.base.theme.editors.foreground)
