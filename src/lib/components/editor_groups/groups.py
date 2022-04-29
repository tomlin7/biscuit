import os
from tkinter import ttk

from ..editor_types import Editor
from ..editor_types import DiffViewer
from ..find_replace import FindReplace


class EditorGroups(ttk.Notebook):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        # dnd
        self.configure(ondrop=self.drop, style="EditorTabs")

        self.closed_tabs = {}
        # {path: [name, exists, editor]}
        self.opened_tabs = {}
        # {path: [name, exists, editor]}

        # {path: [name, editor]}
        self.closed_diff_tabs = {}
        # {path: [name, editor]}
        self.opened_diff_tabs = {}

        self._active = None

        self.find_replace = FindReplace(self)
        self.find_replace_active = False
    
        self.bind("<ButtonPress-1>", self.on_close_press, True)
        self.bind("<ButtonRelease-1>", self.on_close_release)

        self.bind("<<NotebookTabChanged>>", self.refresh_active_file)
    
    def get_find_replace_position(self):
        pos_x, pos_y, width = self.winfo_rootx(), self.winfo_rooty(), self.winfo_width()
        return ((pos_x + width) - (self.find_replace.winfo_width() + 40), pos_y+81)
    
    #TODO: replace widget
    def show_find_widget(self, replace=False):
        self.show_find_replace()

    def show_find_replace(self, *args):
        if not self.find_replace_active:
            self.find_replace.show(self.get_find_replace_position())
        else:
            self.find_replace.reset()

    def on_close_press(self, event):
        element = self.identify(event.x, event.y)

        if "close" in element:
            index = self.index("@{0.x},{0.y}".format(event))
            self.state(['pressed'])
            self._active = index
            return "break"

    def on_close_release(self, event):
        if not self.instate(['pressed']):
            return

        element =  self.identify(event.x, event.y)
        if "close" not in element:
            return

        index = self.index("@%d,%d" % (event.x, event.y))

        if self._active == index:
            # self.forget(index)    
            self.remove_tab_index(index)

        self.state(["!pressed"])
        self._active = None

    def drop(self, event):
        if os.path.isfile(event.data):
            self.base.set_active_file(file=event.data, exists=True)
        elif os.path.isdir(event.data):
            self.base.open_in_new_window(dir=event.data)

    def refresh_active_file(self, e=None):
        self.base.active_file = None
        for editor in self.opened_tabs.items():
            if self.index(editor[1][2]) == self.index(self.select()):
                self.base.active_file = editor[0]
                self.base.update_statusbar_ln_col_info()
                break
        
        for diff in self.opened_diff_tabs.items():
            if self.index(diff[1][1]) == self.index(self.select()):
                self.base.active_file = diff[0]
                self.base.update_statusbar_ln_col_info()
                break

    def update_tabs(self):
        for opened_file in self.base.opened_files:
            if opened_file[0] not in self.opened_tabs.keys() or not opened_file[1]:
                self.add_editor(os.path.basename(opened_file[0]), opened_file[1], opened_file[0])
        
        for opened_diff in self.base.opened_diffs:
            if opened_diff not in self.opened_diff_tabs.keys():
                self.add_diff_viewer(os.path.basename(opened_diff), opened_diff)
        
    def add_editor(self, name, exists, path):
        if not path in self.closed_tabs.keys():
            self.opened_tabs[path] = [name, exists, Editor(self, path, exists)]
            self.opened_tabs[path][2].configure(height=25, width=75)
            self.add(self.opened_tabs[path][2], text=f'{name: ^20s}')
        else:
            self.opened_tabs[path] = self.closed_tabs.pop(path)
            self.opened_tabs[path][2].configure(height=25, width=75)
            self.add(self.opened_tabs[path][2], text=f'{name: ^20s}')
            self.opened_tabs[path][2].focus()

        self.select(self.opened_tabs[path][2])

    def add_diff_viewer(self, name, path):
        if not path in self.closed_diff_tabs.keys():
            self.opened_diff_tabs[path] = [name, DiffViewer(self, path)]
            self.opened_diff_tabs[path][1].configure(height=25, width=75)
            self.add(self.opened_diff_tabs[path][1], text=f'{name: ^20s}')
        else:
            self.opened_diff_tabs[path] = self.closed_diff_tabs.pop(path)
            self.opened_diff_tabs[path][1].configure(height=25, width=75)
            self.add(self.opened_diff_tabs[path][1], text=f'{name: ^20s}')
            self.opened_diff_tabs[path][1].focus()

        self.select(self.opened_diff_tabs[path][1])

    def set_active_tab(self, path):
        if path in self.opened_tabs.keys():
            self.select(self.opened_tabs[path][2])
            self.opened_tabs[path][2].focus()
        elif path in self.opened_diff_tabs.keys():
            self.select(self.opened_diff_tabs[path][1])
            self.opened_diff_tabs[path][1].focus()
        else:
            self.base.trace(f"Tab<{path}> was not found.")
        
    def remove_tab_index(self, index):
        for opened_file in self.opened_tabs.items():
            if self.index(opened_file[1][2]) == index:
                tab = opened_file[0]

                self.closed_tabs[tab] = self.opened_tabs.pop(tab)
                self.hide(self.closed_tabs[tab][2])

                self.refresh_active_file()
                self.base.remove_from_open_files(tab)
                break
        
        for opened_diff in self.opened_diff_tabs.items():
            if self.index(opened_diff[1][1]) == index:
                tab = opened_diff[0]

                self.closed_diff_tabs[tab] = self.opened_diff_tabs.pop(tab)
                self.hide(self.closed_diff_tabs[tab][1])

                self.refresh_active_file()
                self.base.remove_from_open_diffs(tab)
                break
                

    def remove_tab(self, tab):
        if not tab:
            return

        if tab in self.opened_tabs.keys():
            self.closed_tabs[tab] = self.opened_tabs[tab]
            self.hide(self.opened_tabs[tab][2])

            self.opened_tabs.pop(tab)
        else:
            self.closed_diff_tabs[tab] = self.opened_diff_tabs[tab]
            self.hide(self.opened_diff_tabs[tab][1])

            self.opened_diff_tabs.pop(tab)
        
        self.refresh_active_file()
        self.update_tabs()
        
    def get_active_tab(self):
        if self.base.active_file in self.opened_tabs.keys():
            return self.opened_tabs[self.base.active_file][2]
        elif self.base.active_file in self.opened_diff_tabs.keys():
            return self.opened_diff_tabs[self.base.active_file][1]
        else:
            return None

    def get_active_text(self):
        return self.opened_tabs[self.base.active_file][2].content.text.get_all_text()