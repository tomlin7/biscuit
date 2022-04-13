import os
import tkinter as tk


class EditorPath(tk.Frame):
    def __init__(self, master, path=None, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master

        self.config(bg="#ffffff")

        self.path = path.split('\\')[1:]
        self.path_btns = []

        for i in self.path:
            #TODO: show path items on click
            if i == self.path[-1]:
                btn = tk.Button(self, text=i, font=("Segoe UI", 13))
            else:
                btn = tk.Menubutton(self, text=f"{i} ›", font=("Segoe UI", 13))
            btn.config(padx=1, fg="#818181", bg="#ffffff", activebackground="#ffffff", activeforeground="#4e4e4e")
            btn.pack(side=tk.LEFT)
            self.path_btns.append(btn)
