import os
from tkinter import ttk

from lib.components.editor import Editor


class EditorTabs(ttk.Notebook):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.opened_tabs_data = {}
        # self.opened_tab_ids = {}
        self.opened_editors = {}

    def update_tabs(self):
        for i in self.base.opened_files:
            filename = os.path.basename(i)
            if filename not in self.opened_tabs_data.keys():
                self.opened_tabs_data[filename] = i
                self.base.trace(f"Tab<{filename}> was added.")
        
        self.update_opened_editors()
        self.base.trace(f"Opened Tabs {self.opened_tabs_data}")

    def update_opened_editors(self):
        for i in self.opened_tabs_data.keys():
            if i not in self.opened_editors:
                self.add_editor(i)
        self.base.trace(f"Opened editors {self.opened_editors.keys()}")
    
    def add_editor(self, i):
        self.opened_editors[i] = Editor(self, path=self.opened_tabs_data[i])
        self.opened_editors[i].configure(height=25, width=75)
        self.add(self.opened_editors[i], text=i)

        self.base.trace(f"Editor<{i}> was added.")
