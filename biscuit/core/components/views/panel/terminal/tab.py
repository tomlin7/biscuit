import tkinter as tk

from core.components.utils import Menubutton


class Tab(Menubutton):
    def __init__(self, master, view, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.view = view
        self.selected = False
        
        self.config(text=view.__title__ or view.__class__.__name__, padx=5, pady=5, anchor=tk.W,
            font=("Segoe UI", 11), **self.base.theme.views.panel.terminal.tab)

        self.bind('<Button-1>', self.select)

    def deselect(self, *_):
        if self.selected:
            self.view.grid_remove()
            self.config(fg=self.base.theme.views.panel.terminal.tab.foreground)
            self.selected = False
        
    def select(self, *_):
        if not self.selected:
            self.master.set_active_tab(self)
            self.view.grid(column=0, row=0, sticky=tk.NSEW)
            self.config(fg=self.base.theme.views.panel.terminal.tab.selectedforeground)
            self.selected = True
