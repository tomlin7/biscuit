import tkinter as tk

from .tabs import EditorTabs
from ..placeholders.emptytab import EmptyTab

class EditorTabsPane(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.active = False

        self.tabs = EditorTabs(self)
        self.emptytab = EmptyTab(self)

        self.emptytab.pack(side=tk.TOP, fill=tk.BOTH, expand=True)

    def show(self):
        if self.active:
            self.tabs.pack_forget()
            self.emptytab.pack(side=tk.TOP, fill=tk.BOTH, expand=True)
            self.active = True
    
    def hide(self):
        if not self.active:
            self.emptytab.pack_forget()
            self.tabs.pack(side=tk.TOP, fill=tk.BOTH, expand=True)
            self.active = False