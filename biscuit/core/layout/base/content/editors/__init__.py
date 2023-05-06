import tkinter as tk
from tkinter.constants import *

from .editorsbar import Editorsbar
from .empty import Empty


class EditorsPane(tk.Frame):
    """
    Tabbed container for editors.

    +---------------------------------+
    | File1.txt | File2.py |          |
    +---------------------------------+
    | \    \    \    \    \    \    \ |
    |  \    \    \    \    \    \    \|
    |   \    \    \    \    \    \    |
    |    \    \    \    \    \    \   |
    |\    \    \    \    \    \    \  |
    +---------------------------------+
    """
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.config(bg='white')

        self.grid_propagate(False)
        self.grid_rowconfigure(1, weight=1)
        self.grid_columnconfigure(0, weight=1)

        self.editorsbar = Editorsbar(self)
        self.editorsbar.grid(row=0, column=0, sticky=EW)
        self.tabs = self.editorsbar.tabs

        self.editors = []
        self.empty = True
        self.emptytab = Empty(self)
        self.emptytab.grid(column=0, row=1, sticky=NSEW)

        self.default_editors = []
        self.add_editors(self.default_editors)

    def add_editors(self, editors):
        "Append editors to list. Create tabs for them."
        for editor in editors:
            self.add_editor(editor)
    
    def add_editor(self, editor):
        "Appends a editor to list. Create a tab."
        self.editors.append(editor)
        self.tabs.add_tab(editor)
        
    def delete_all_editors(self):
        "Permanently delete all editors."
        for editor in self.editors:
            editor.destroy()

        self.editors.clear()
    
    def delete_editor(self, editor):
        "Permanently delete a editor."
        self.editors.remove(editor)
        editor.destroy()
        self.refresh()
    
    def set_active_editor(self, editor):
        "Set active editor and active tab."
        ...
    
    def get_active_editor():
        "Get active editor."
        ...
    
    def refresh(self):
        if not len(self.editors) and not self.empty:
            self.empty = not self.empty
            self.emptytab.grid()
        if len(self.editors) and self.empty:
            self.emptytab.grid_remove()
