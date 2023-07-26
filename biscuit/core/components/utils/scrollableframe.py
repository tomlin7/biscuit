import tkinter as tk
from tkinter import ttk

from .frame import Frame
from .canvas import Canvas


class Scrollbar(ttk.Scrollbar):
    def set(self, low, high):
        if float(low) <= 0.0 and float(high) >= 1.0:
            self.pack_forget()
        else:
            self.pack(side=tk.RIGHT, fill=tk.Y)
        ttk.Scrollbar.set(self, low, high)


class ScrollableFrame(Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.border)
        
        self.scrollbar = Scrollbar(self)
        self.scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        self.canvas = Canvas(self, yscrollcommand=self.scrollbar.set, **self.base.theme.editors)
        self.canvas.configure(highlightthickness=0)
        self.canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.scrollbar.config(command=self.canvas.yview)

        self.content = Frame(self.canvas, **self.base.theme.editors)
        self._content = self.canvas.create_window((0, 0), window=self.content, anchor="nw")

        self.content.bind("<Configure>", self._scroll)
        self.canvas.bind("<Configure>", self._configure_canvas)

    def _scroll(self, event):
        self.canvas.configure(scrollregion=self.canvas.bbox("all"))

    def _configure_canvas(self, event):
        canvas_width = event.width
        self.canvas.itemconfig(self._content, width=canvas_width)

    def add(self, content):
        content.pack(in_=self.content)
