import tkinter as tk

from .togglew import ToggleWidget
from .container import FindReplaceContainer


class FindReplace(tk.Toplevel):
    def __init__(self, master, state=False, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.state = state
        self.font = self.base.settings.font

        if not state:
            self.withdraw()
        
        self.overrideredirect(True)
        self.config(bg="#c8c8c8")

        self.togglew = ToggleWidget(self)
        self.container = FindReplaceContainer(self)

        self.rowconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=1)

        self.togglew.grid(row=0, column=0, sticky=tk.NS, padx=(2, 0))
        self.container.grid(row=0, column=1, sticky=tk.NSEW)
        
        self.config_bindings()
    
    def config_bindings(self, *args):
        self.container.find_entry.entry.bind("<Configure>", self.do_find)
    
    def toggle_replace(self, state):
        self.container.toggle_replace(state)

    def do_find(self, *args):
        print(self.container.get_term())
    
    def refresh_geometry(self, *args):
        self.update_idletasks()

    def show(self, pos):
        self.state = True
        self.update_idletasks()
        self.geometry("+{}+{}".format(*pos))
        self.deiconify()
        self.master.find_replace_active = True

    def hide(self, *args):
        self.state = False
        self.withdraw()
        self.master.find_replace_active = False
    
    def reset(self, *args):
        ...
    