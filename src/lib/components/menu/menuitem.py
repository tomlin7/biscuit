import tkinter as tk


class MenuItem(tk.Menubutton):
    def __init__(self, master, text, command, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        
        self.base = master.base
        self.master = master

        self.config(text=text, anchor=tk.W, font="Helvetica 11",
            padx=30, bg="#ffffff", fg="#7d7d7d", pady=5,
            activebackground="#0060c0", activeforeground="#ffffff"
        )
        self.bind("<Button-1>", command)
