import tkinter as tk

from ...utils import IconButton


class ItemBar(tk.Frame):
    def __init__(self, master, title=None, buttons=(), *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.grid_columnconfigure(1, weight=1)

        self.title = tk.StringVar()
        if title:
            self.set_title(title)
            
        self.toggle = IconButton(self, icon='chevron-down', event=self.toggle_content, width=1)
        self.toggle.grid(row=0, column=0)

        self.label_title = tk.Label(self, anchor=tk.W, textvariable=self.title)
        self.label_title.grid(row=0, column=1, sticky=tk.EW)

        self.buttoncolumn = 0
        self.buttonframe = tk.Frame(self)
        self.buttonframe.base = self.base
        self.buttonframe.grid(row=0, column=2, sticky=tk.E)

        self.add_buttons(buttons)

    def add_button(self, icon, event=lambda _: None):
        IconButton(self.buttonframe, icon=icon, event=event, activebackground='#e1e1e1').grid(row=0, column=self.buttoncolumn)
        self.buttoncolumn += 1
    
    def add_buttons(self, buttons):
        for btn in buttons:
            self.add_button(*btn)

    def set_title(self, title):
        self.title.set(title.upper())
    
    def toggle_content(self, *_):
        if not self.master.enabled:
            self.toggle.set_icon('chevron-down')
        else:
            self.toggle.set_icon('chevron-right')
        self.master.toggle()

