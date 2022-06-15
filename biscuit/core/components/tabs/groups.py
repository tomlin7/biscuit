import os
from tkinter import ttk

from ..editor_types import EditorsManager


class EditorGroups(ttk.Notebook):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        # ondrop=self.drop
        self.configure(style="EditorTabs")
        # {path: editor}
        self.closed_editors = {}
        self.opened_editors = {}

        self._active = None
    
        # self.bind("<ButtonPress-1>", self.on_close_press, True)
        # self.bind("<ButtonRelease-1>", self.on_close_release)

        self.bind("<<NotebookTabChanged>>", self.refresh_active_file)

    # def on_close_press(self, event):
    #     element = self.identify(event.x, event.y)

    #     if "close" in element:
    #         index = self.index("@{0.x},{0.y}".format(event))
    #         self.state(['pressed'])
    #         self._active = index
    #         return "break"

    # def on_close_release(self, event):
    #     if not self.instate(['pressed']):
    #         return

    #     element =  self.identify(event.x, event.y)
    #     if "close" not in element:
    #         return

    #     index = self.index("@%d,%d" % (event.x, event.y))

    #     if self._active == index:
    #         self.remove_tab_index(index)

    #     self.state(["!pressed"])
    #     self._active = None

    # def drop(self, event):
    #     if os.path.isfile(event.data):
    #         self.base.set_active_file(file=event.data, exists=True)
    #     elif os.path.isdir(event.data):
    #         self.base.open_in_new_window(dir=event.data)

    # def refresh_active_file(self, e=None):
    #     self.base.active_editor = None
    #     for editor in self.opened_tabs.items():
    #         if self.index(editor[1]) == self.index(self.select()):
    #             self.base.active_editor = editor
    #             self.base.update_statusbar_ln_col_info()
    #             break
        
    def add_editor(self, name, path, exists, diff=False):
        if not path in self.closed_editors.keys():
            editor = EditorsManager.get_editor(name, path, exists, diff)
            self.opened_editors[path] = editor
            self.opened_editors[path].configure(height=25, width=75)
            self.add(self.opened_editors[path], text=f'{name: ^20s}')
        else:
            self.opened_editors[path] = self.closed_editors.pop(path)
            self.opened_editors[path].configure(height=25, width=75)
            self.add(self.opened_editors[path], text=f'{name: ^20s}')
            self.opened_editors[path].focus()

        self.select(self.opened_editors[path])

    def set_active_tab(self, path):
        if path in self.opened_editors.keys():
            self.select(self.opened_editors[path])
            self.opened_editors[path].focus()
        else:
            self.base.trace(f"Tab<{path}> was not found.")
        
    def remove_tab_index(self, index):
        for editor in self.opened_editors.items():
            if self.index(editor) == index:
                self.closed_editors[editor.path] = self.opened_editors.pop(editor.path)
                self.hide(self.closed_editors[editor.path])

                # self.refresh_active_editor()
                break

    def remove_tab(self, path):
        if not path:
            return

        if path in self.opened_editors.keys():
            self.closed_editors[path] = self.opened_editors[path]
            self.hide(self.opened_editors[path])

            self.opened_editors.pop(path)
        
    def get_active_tab(self):
        if self.base.active_editor in self.opened_editors.keys():
            return self.opened_editors[self.base.active_editor]

    def get_active_text(self):
        return self.opened_editors[self.base.active_editor].content.text.get_all_text()