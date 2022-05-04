import tkinter as tk


class Notification(tk.Frame):
    """Base Notification"""
    def __init__(self, master, text, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        # self.base = master.base

        self.text = tk.Label(self, text=text)
        self.text.pack()