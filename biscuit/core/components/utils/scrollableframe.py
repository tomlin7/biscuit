import tkinter as tk
from tkinter import ttk


class Scrollbar(ttk.Scrollbar):
    def set(self, low, high):
        if float(low) <= 0.0 and float(high) >= 1.0:
            self.pack_forget()
        else:
            self.pack(side=tk.RIGHT, fill=tk.Y)
        ttk.Scrollbar.set(self, low, high)


class ScrollableFrame(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)

        self.scrollbar = Scrollbar(self)
        self.scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        self.canvas = tk.Canvas(self, yscrollcommand=self.scrollbar.set)
        self.canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.scrollbar.config(command=self.canvas.yview)

        self.inner_frame = tk.Frame(self.canvas)
        self.canvas.create_window((0, 0), window=self.inner_frame, anchor="nw")

        self.inner_frame.bind("<Configure>", self._scroll)
        #self.canvas.bind("<Configure>", self._configure_canvas)

    def _scroll(self, event):
        self.canvas.configure(scrollregion=self.canvas.bbox("all"))

    # def _configure_canvas(self, event):
    #     canvas_width = event.width
    #     self.canvas.itemconfig(self.inner_frame, width=canvas_width)

    def add_content(self, content):
        content.pack(in_=self.inner_frame)
