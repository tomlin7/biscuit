import tkinter as tk
from tkinter.constants import *

from .scrollbar import Scrollbar


class ScrollableFrame(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)

        self.cv = tk.Canvas(self, bg="#f3f3f3", highlightthickness=0)
        self.cv.grid(row=0, column=0, sticky=NSEW)

        # self.frame = tk.Frame(self.cv)
        # self.frame.grid_rowconfigure(0, weight=1)
        # self.frame.grid_columnconfigure(0, weight=1)
        # self.frameID = self.cv.create_window(0, 0, window=self.frame, anchor=NW)
        
        # self.frame.bind("<Configure>", lambda e: self.cv.configure(scrollregion=self.cv.bbox(ALL)))
        # self.cv.bind('<Configure>', lambda e: self.cv.itemconfig(self.frameID, width=e.width, height=e.height))
    
        self.scrollbar = tk.Scrollbar(self, orient=tk.VERTICAL, command=self.cv.yview)
        self.scrollbar.grid(row=0, column=1, sticky=NS)
        self.cv.config(yscrollcommand=self.scrollbar.set)
