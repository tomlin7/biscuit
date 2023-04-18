import tkinter as tk


def placeholder(*_): ...

class MenuItem(tk.Menubutton):
    def __init__(self, master, text, command, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master
        self.command = command
        
        self.config(text=text, anchor=tk.W, font=("Segoe UI", 10),
            padx=20, bg="#ffffff", fg="#616161", pady=2,
            activebackground="#0060c0", activeforeground="#ffffff"
        )
        self.bind("<Button-1>", self.command or placeholder)
