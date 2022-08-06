import tkinter as tk
from tkinter.constants import *

from .tabs import Tabs
from .....components import Editor

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
        self.pack_propagate(False)

        self.tabs = Tabs(self)
        self.tabs.pack(expand=1, fill=tk.BOTH)

        self.active_editor = None
        self.editors = []

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
        self.set_active_editor(editor)
        
    def delete_all_editors(self):
        "Permanently delete all editors."
        for editor in self.editors:
            editor.destroy()

        self.editors.clear()
    
    def delete_editor(self, editor):
        "Permanently delete a editor."
        editor.destroy()
        self.editors.remove(editor)
    
    def set_active_editor(self, editor):
        "Set active editor and active tab."
        self.active_editor = editor
        for _editor in self.editors:
            _editor.pack_forget()
        editor.pack(fill=tk.BOTH)
    
