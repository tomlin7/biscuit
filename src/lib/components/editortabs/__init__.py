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

    def hide(self):
        if self.active:
            self.tabs.pack_forget()
            self.emptytab.pack(side=tk.TOP, fill=tk.BOTH, expand=True)
            self.active = False
    
    def show(self):
        if not self.active:
            self.emptytab.pack_forget()
            self.tabs.pack(side=tk.TOP, fill=tk.BOTH, expand=True)
            self.active = True
        
    def update_panes(self):
        if self.base.active_file is not None:
            self.show()
            print(f"Showing tabs ---- {self.base.active_file}")
        else:
            self.hide()
            print(f"Hiding tabs ---- {self.base.active_file}")