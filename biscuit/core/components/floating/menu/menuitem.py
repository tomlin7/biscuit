import tkinter as tk


class MenuItem(tk.Menubutton):
    def __init__(self, master, text, command=lambda *_:..., *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master
        self.command = command
        
        self.config(text=text, anchor=tk.W, font=("Segoe UI", 10),
            padx=20, bg="#ffffff", fg="#424242", pady=2,
            activebackground="#e8e8e8", activeforeground="black"
        )
        self.bind("<Button-1>", self.onclick)
    
    def onclick(self, *_):
        self.master.hide()
        self.command()
