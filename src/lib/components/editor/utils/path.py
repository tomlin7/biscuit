import os, re
import tkinter as tk


class EditorPath(tk.Frame):
    def __init__(self, master, path=None, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master

        self.config(bg="#C6C3C3")

        self.path = path.split('\\')
        self.path_btns = []

        for i in self.path:
            btn = tk.Menubutton(self, text=f"{i} ›", font=("Verdana", 14)) # , command=self.change_path)
            btn.config(padx=1, fg="#000000", bg="#C6C3C3", activebackground="#4c4a48", activeforeground="#ffffff")
            btn.pack(side=tk.LEFT)
            self.path_btns.append(btn)

        # self.config(bg="#6c6c6c", fg="#ffffff")

