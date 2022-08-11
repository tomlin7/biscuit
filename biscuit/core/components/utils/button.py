import tkinter as tk


class Button(tk.Menubutton):
    def __init__(self, master, text, command=lambda _: None, *args, **kwargs):
        super().__init__(master, text=text, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.config(bg="#007acc", fg="#ffffff", activebackground="#0062a3", activeforeground="#ffffff", pady=5)
        self.bind('<Button-1>', command)
