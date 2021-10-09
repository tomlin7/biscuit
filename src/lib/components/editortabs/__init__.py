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

        # data
        # {path: name}

        # editors
        # {path: [name, editor]}
    
    def drop(self, event):
        if os.path.isfile(event.data):
            self.base.add_to_open_files(file=event.data)
        elif os.path.isdir(event.data):
            self.base.open_in_new_window(dir=event.data)

        self.base.trace(f"Dropped file: {event.data}")

    def update_tabs(self):
        for filepath in self.base.opened_files:
            filename = os.path.basename(filepath)
            if filepath not in self.opened_tabs_data.keys():
                self.opened_tabs_data[filepath] = filename
                self.base.trace(f"Tab<{filepath}> was added.")
        
        self.update_opened_editors()
        self.base.trace(f"Opened Tabs {self.opened_tabs_data}")

    def update_opened_editors(self):
        for path, name in self.opened_tabs_data.items():
            if path not in self.opened_editors.keys():
                self.add_editor(name, path)
        self.base.trace(f"Opened editors {self.opened_editors.keys()}")
    
    def add_editor(self, name, path):
        self.opened_editors[path] = [name, Editor(self, path=path)]
        self.opened_editors[path][1].configure(height=25, width=75)
        self.add(self.opened_editors[path][1], text=name)

        # switch to newly added tab
        self.select(self.opened_editors[path][1])

        self.base.trace(f"Editor<{path}> was added.")
