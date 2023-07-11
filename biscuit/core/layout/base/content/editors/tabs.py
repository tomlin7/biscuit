import tkinter as tk

from .tab import Tab
from core.components.utils import Frame


class Tabs(Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.layout.base.content.editors.bar)

        self.tabs = []
        self.active_tab = None

    def add_tab(self, view):
        tab = Tab(self, view)
        tab.pack(fill=tk.Y, side=tk.LEFT, padx=(0, 1))
        self.tabs.append(tab)

        tab.select()
    
    def close_active_tab(self):
        self.close_tab(self.active_tab)
    
    def close_tab(self, tab):
        i = self.tabs.index(tab)
        self.tabs.remove(tab)
        tab.editor.grid_forget()
        self.master.master.close_editor(tab.editor)
        tab.destroy()
        
        if self.tabs:
            if i < len(self.tabs):
                self.tabs[i].select()
            else:
                self.tabs[i-1].select()
        else:
            self.active_tab = None
        self.master.master.refresh()
        
    def set_active_tab(self, selected_tab):
        self.active_tab = selected_tab
        if selected_tab.editor.content:
            self.master.replace_buttons(selected_tab.editor.content.__buttons__)
        for tab in self.tabs:
            if tab != selected_tab:
                tab.deselect()

    def clear_all_tabs(self):
        for tab in self.tabs:
            tab.destroy()
        
        self.tabs.clear()
