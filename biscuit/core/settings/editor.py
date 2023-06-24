import tkinter as tk

from core.components.utils import ScrollableFrame
from core.components.editors.editor import BaseEditor


class SettingsEditor(BaseEditor):
    def __init__(self, master, exists=False, editable=False, *args, **kwargs):
        super().__init__(master, exists=exists, editable=editable, *args, **kwargs)
        self.config(padx=100, bg='white')
        self.filename = 'settings'

        self.search = ...

        self.container = ScrollableFrame(self)
        self.container.pack(fill=tk.BOTH, expand=True)

        for i in range(40):
            label = tk.Label(self.container.inner_frame, text=f"Item {i+1}")
            self.container.add_content(label)
    
    def add_section(self, name):
        ...
    
    def show_result(self, items):
        if not any(items):
            return self.show_no_results()
    
    def show_no_results(self):
        ...
