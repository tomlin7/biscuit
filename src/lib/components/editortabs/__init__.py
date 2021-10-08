import os
import tkinter as tk
from tkinter import ttk

from lib.components.editor import Editor


class EditorTabs(ttk.Notebook):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.opened_tab_names = []
        # self.opened_tab_ids = {}
        self.opened_editors = {}
        
        # self.update_opened_tabs()

    def update_tabs(self):
        for i in self.base.opened_files:
            filename = os.path.basename(i)
            if filename not in self.opened_tab_names:
                self.opened_tab_names.append(filename)
                # self.add(tk.Text(), text=filename)
                self.base.trace(f"Tab<{filename}> was added.")
        
        # for i in self.opened_tab_names:
        #     if i not in self.base.opened_files:
        #         self.base.trace(f"Tab<{i}> was removed.")
        #         self.forget(self.opened_tab_ids[i])
        
        self.update_opened_editors()
        # self.update_opened_tabs()

    # def update_opened_tabs(self):
    #     self.update_opened_editors()

    #     for i in self.tabs():
    #         tabname = self.tab(i)['text']
    #         if tabname not in self.opened_tab_names:
    #             self.opened_tab_names.append(tabname)
    #             self.opened_tab_ids[tabname] = i
        
        # for i in self.opened_tab_names:
        #     if i not in self.base.opened_files:
        #         self.opened_tab_names.remove(i)
        #         self.opened_tab_ids.pop(i)

        self.base.trace(f"Opened Tabs {self.opened_tab_names}")

    def update_opened_editors(self):
        for i in self.opened_tab_names:
            if i not in self.opened_editors:
                self.opened_editors[i] = Editor(self)
                self.opened_editors[i].configure(height=25, width=75)
                self.add(self.opened_editors[i], text=i)
        self.base.trace(f"Opened editors {self.opened_editors.keys()}")
