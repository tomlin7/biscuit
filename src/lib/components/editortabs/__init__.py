import os
from tkinter import ttk

from lib.components.editor import Editor


class EditorTabs(ttk.Notebook):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        # dnd
        self.configure(ondrop=self.drop)

        self.opened_tabs_data = {}
        self.opened_editors = {}
    
    def drop(self, event):
        if os.path.isfile(event.data):
            self.base.add_to_open_files(file=event.data)
        elif os.path.isdir(event.data):
            self.base.open_in_new_window(dir=event.data)

        self.base.trace(f"Dropped file: {event.data}")

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

        # switch to newly added tab
        self.select(self.opened_editors[i])

        self.base.trace(f"Editor<{i}> was added.")
