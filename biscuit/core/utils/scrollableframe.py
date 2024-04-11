import tkinter as tk
from tkinter import ttk

from .canvas import Canvas
from .frame import Frame


class ScrollableFrame(Frame):
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.border)

        self.scrollbar = ttk.Scrollbar(self, style="EditorScrollbar")
        self.scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        self.canvas = Canvas(self, yscrollcommand=self.scrollbar.set, **self.base.theme.editors)
        self.canvas.configure(highlightthickness=0)
        self.canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.scrollbar.config(command=self.canvas.yview)

        self.items = []

        self.content = Frame(self.canvas, **self.base.theme.editors)
        self._content = self.canvas.create_window((0, 0), window=self.content, anchor="nw")

        self.content.bind("<Configure>", self._scroll)
        self.canvas.bind("<Configure>", self._configure_canvas)
        self.canvas.bind_all("<MouseWheel>", self._on_mousewheel) 
    
    def _scroll(self, _) -> None:
        self.canvas.configure(scrollregion=self.canvas.bbox("all"))

    def _configure_canvas(self, event) -> None:
        canvas_width = event.width
        self.canvas.itemconfig(self._content, width=canvas_width)
    
    def _on_mousewheel(self, event) -> None:
        self.canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

    def add(self, content, *args, **kwargs) -> None:
        content.pack(in_=self.content, *args, **kwargs)
        self.items.append(content)
