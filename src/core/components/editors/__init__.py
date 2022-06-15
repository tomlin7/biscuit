<<<<<<< HEAD
from .editor import Editor
from .tabsbar import Tabsbar
=======
import tkinter as tk

from .groups import EditorGroups
from ..placeholders.emptytab import EmptyTab

class EditorGroupsPane(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.active = False

        self.groups = EditorGroups(self)
        self.emptytab = EmptyTab(self)

        self.emptytab.pack(side=tk.TOP, fill=tk.BOTH, expand=True)

    def disable(self):
        if self.active:
            self.groups.pack_forget()
            self.emptytab.pack(side=tk.TOP, fill=tk.BOTH, expand=True)
            self.active = False
    
    def enable(self):
        if not self.active:
            self.emptytab.pack_forget()
            self.groups.pack(side=tk.TOP, fill=tk.BOTH, expand=True)
            self.active = True
        
    def update_panes(self):
        if self.base.active_editor is not None:
            self.enable()
        else:
            self.disable()
>>>>>>> dec37119ca8c68530b309efab68650a6ead758f5
