import tkinter as tk
from tkinter import ttk


class DND():
    def __init__(self, master, *args, **kwargs):
        self.master = master
        self.data = None

        self.setup()

    def drop(self, event):
        self.data = event.data
    
    def setup(self):
        self.master.configure(ondrop=self.drop)
