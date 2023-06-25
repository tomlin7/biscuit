import tkinter as tk

from core.components.utils import ScrollableFrame
from core.components.editors.editor import BaseEditor

from .searchbar import Searchbar
from .section import Section


class SettingsEditor(BaseEditor):
    def __init__(self, master, exists=False, editable=False, *args, **kwargs):
        super().__init__(master, exists=exists, editable=editable, *args, **kwargs)
        self.config(padx=100, bg='white')
        self.filename = 'settings'

        self.search = Searchbar(self)
        self.search.pack(fill=tk.X, pady=20)

        self.sections = []
        self.container = ScrollableFrame(self)
        self.container.pack(fill=tk.BOTH, expand=True)

        for i in range(5):
            test = self.add_section(f"Commonly Used {i}")
            test.add_stringvalue()
            test.add_dropdown()
            test.add_checkbox()
            test.add_intvalue()
    
    def add_section(self, name):
        section = Section(self.container.content, name)
        section.pack(fill=tk.X, expand=True)
        self.sections.append(section)
        return section
    
    def show_result(self, items):
        if not any(items):
            return self.show_no_results()
    
    def show_no_results(self):
        ...
