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
            self.base.set_active_file(file=event.data, exists=True)
        elif os.path.isdir(event.data):
            self.base.open_in_new_window(dir=event.data)

        self.base.trace(f"Dropped file: {event.data}")

    def update_tabs(self):
        for filepath in self.base.opened_files:
            filename = os.path.basename(filepath[0])
            if filepath[0] not in self.opened_tabs_data.keys():
                self.opened_tabs_data[filepath[0]] = [filename, filepath[1]]
                self.base.trace(f"Tab<{filepath}> was added.")
        
        self.update_opened_editors()
        self.base.trace(f"Opened Tabs {self.opened_tabs_data}")

    def update_opened_editors(self):
        for path, data in self.opened_tabs_data.items():
            if path not in self.opened_editors.keys() or not data[1]:
                self.add_editor(data[0], data[1], path)
        self.base.trace(f"Opened editors {self.opened_editors.keys()}")
    
    def add_editor(self, name, exists, path):
        self.opened_editors[path] = [name, exists, Editor(self, path, exists)]
        self.opened_editors[path][2].configure(height=25, width=75)
        self.add(self.opened_editors[path][2], text=name)

        # switch to newly added tab
        self.select(self.opened_editors[path][2])

        self.base.trace(f"Editor<{path}> was added.")
    
    def set_active_tab(self, path):
        if path in self.opened_tabs_data.keys():
            self.select(self.opened_editors[path][2])
        else:
            self.base.trace(f"Tab<{path}> was not found.")
    
    def close_active_tab(self):
        for item in self.winfo_children():
            if str(item) == self.select():
                item.destroy()
                break
    
    def get_active_text(self):
        return self.opened_editors[self.base.active_file][2].text.get_all_text()