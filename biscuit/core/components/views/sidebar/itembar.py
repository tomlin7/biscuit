import tkinter as tk

from ...utils import IconButton


class ItemBar(tk.Frame):
    def __init__(self, master, title=None, buttons=(), *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.grid_columnconfigure(0, weight=1)

        self.title = tk.StringVar()
        if title:
            self.set_title(title)

        self.label_title = tk.Label(self, anchor=tk.W, textvariable=self.title)
        self.label_title.grid(row=0, column=0, sticky=tk.W, padx=(10, 0))

        self.buttoncolumn = 0
        self.buttonframe = tk.Frame(self)
        self.buttonframe.base = self.base
        self.buttonframe.grid(row=0, column=1, sticky=tk.E)

        self.add_buttons(buttons)

    def add_button(self, icon, event=lambda _: None):
        IconButton(self.buttonframe, icon=icon, event=event).grid(row=0, column=self.buttoncolumn)
        self.buttoncolumn += 1
    
    def add_buttons(self, buttons):
        for btn in buttons:
            self.add_button(*btn)

    def set_title(self, title):
        self.title.set(title.upper())
