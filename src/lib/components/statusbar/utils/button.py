import tkinter as tk 


class SButton(tk.Menubutton):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)

        self.config(padx=10, fg="#000000", activebackground="#4c4a48", activeforeground="#ffffff")
