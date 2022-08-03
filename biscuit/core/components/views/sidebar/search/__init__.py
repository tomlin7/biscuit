import tkinter as tk

from ...view import View


class Search(View):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master

        tk.Label(self, text="Search").pack()
