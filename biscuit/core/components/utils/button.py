import tkinter as tk


class Button(tk.Menubutton):
    """
    A Flat style button 
    """
    def __init__(self, master, text, command=lambda _: None, *args, **kwargs):
        super().__init__(master, text=text, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.config(bg="#dc8c34", fg="white", activebackground="#ecb464", activeforeground="white", pady=5)
        self.bind('<Button-1>', command)
