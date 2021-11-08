import os
import tkinter as tk
from tkinter import ttk

from ..editor import Editor


class EditorTabs(ttk.Notebook):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.initialize_style()

        # dnd
        self.configure(ondrop=self.drop, style="EditorTabs")

        self.closed_tabs = {}
        # {path: [name, exists, editor]}
        self.opened_editors = {}
        # {path: [name, exists, editor]}

        self._active = None

        self.bind("<ButtonPress-1>", self.on_close_press, True)
        self.bind("<ButtonRelease-1>", self.on_close_release)

        self.bind("<<NotebookTabChanged>>", self.refresh_active_file)
    
    def initialize_style(self):
        style = ttk.Style()

        self.images = (
            tk.PhotoImage("img_closebtn", data='''
                iVBORw0KGgoAAAANSUhEUgAAAB4AAAAlCAYAAABVjVnMAAAAAXNSR0IArs4
                c6QAAAT9JREFUWEftkrtOhEAUhpkwdhYWEONivMTCGOBAwuPY+RL7DPsSdj
                4OCRyYGAvjJYIxUFjYOWTMbLUxW8yBrFgMzTDJ+f8v880wZ6aPzcR1LPjPz
                FvVVvXODNjHtTO1v4v/v2rf92+CIFgVReFv05Kmadc0zbLrulsTbaQTh2FY
                c879siwPN8uTJPmQUnZCiMgEqmdIYB2Ioujedd2DsiyP9D5JkvdhGD7rur4
                yhY4C61AYhg+c8339L6X8EkJcUqCjwTqYZZnUa57nnAodDQaAF6XUsC5gzE
                XEUyqcfMcA8KR5iHimYQDw7DiOQsRzCpwEjuP4kTG2h4gnmxAAeFVKfVdVd
                WEKNwZ7nne9WCxWiHi8rRwA3tq2XfZ9f2cCNwablFFmLJhia9KsVT1JHyVs
                VVNsTZq1qifpo4RnU/0DhPBZJmDBDSEAAAAASUVORK5CYII=
                '''),
            tk.PhotoImage("img_closebtnhover", data='''
                iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAAAXNSR0IArs4c6QA
                AAPJJREFUSEtjZBggwDhA9jKMWsxgbm5u4+PjE0LNKNi/f/+2ffv27UI2EyOoEx
                MTMzs6OqZR0+LOzs66vr6+5lGLUUJ1NKhhwfH//3+GGzduMGhqamJNd9evX2fQ0
                NBgYGTELBooSlwgg4uLixl6enoYtLS0UCy/du0aQ0lJCUNvby9Wh1FkMcgmmAXI
                lmMTQw8Sii1GtxzEB/kUWyggW04Vi5EtB7EJWQpSM7QtRo5TugX1gCSuActOA1a
                AUFJNUi1Vk+qIUYtBITZ4mj62trbOERERCaTGIz71W7ZsWbt9+/YNeNtc1LQQn1
                mjDXp6hTQDAPpaEC5rdvpRAAAAAElFTkSuQmCC
                ''')
        )

        style.element_create("close", "image", "img_closebtn",
                            ("active", "!disabled", "img_closebtnhover"), 
                            border=8, sticky='')
        style.layout("EditorTabs", [
                ("EditorTabs.client", {
                    "sticky": "nswe"
                })
            ])
        style.layout("EditorTabs.Tab", [
            ("EditorTabs.tab", {
                "sticky": "nswe",
                "children": [
                    ("EditorTabs.padding", {
                        "side": "top",
                        "sticky": "nswe",
                        "children": [
                            ("EditorTabs.label", {"side": "left", "sticky": ''}),
                            ("EditorTabs.close", {"side": "left", "sticky": ''}),
                        ]
                    })
                ]
            })
        ])

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

        self.base.trace(f"Dropped file: {event.data}")

    def refresh_active_file(self, e=None):
        self.base.active_file = None
        for editor in self.opened_editors.items():
            if self.index(editor[1][2]) == self.index(self.select()):
                self.base.active_file = editor[0]
                self.base.update_statusbar_ln_col_info()
                
                self.base.trace(f"Active tab was changed to {editor[0]}")
                break
        self.base.trace(f"Currently Active file: {self.base.active_file}")

    def update_tabs(self):
        for opened_file in self.base.opened_files:
            if opened_file[0] not in self.opened_editors.keys() or not opened_file[1]:
                self.add_editor(os.path.basename(opened_file[0]), opened_file[1], opened_file[0])
                
                self.base.trace(f"Tab<{opened_file}> was added.")
        
        self.base.trace(f"Opened Tabs {self.opened_editors}")
    
    def add_editor(self, name, exists, path):
        if not path in self.closed_tabs.keys():
            self.opened_editors[path] = [name, exists, Editor(self, path, exists)]
            self.opened_editors[path][2].configure(height=25, width=75)
            self.add(self.opened_editors[path][2], text=f'{name: ^20s}')
        else:
            self.opened_editors[path] = self.closed_tabs.pop(path)
            self.opened_editors[path][2].configure(height=25, width=75)
            self.add(self.opened_editors[path][2], text=f'{name: ^20s}')

        # switch to newly added tab
        self.select(self.opened_editors[path][2])

        self.base.trace(f"Editor<{path}> was added.")
    
    def set_active_tab(self, path):
        if path in self.opened_editors.keys():
            self.select(self.opened_editors[path][2])
        else:
            self.base.trace(f"Tab<{path}> was not found.")
        
    def remove_tab_index(self, index):
        for opened_file in self.opened_editors.items():
            if self.index(opened_file[1][2]) == index:
                tab = opened_file[0]

                self.closed_tabs[tab] = self.opened_editors.pop(tab)
                self.hide(self.closed_tabs[tab][2])

                self.refresh_active_file()
                self.base.remove_from_open_files(tab)

                self.base.trace(f"Tab<{tab}> was closed.")

                break
                

    def remove_tab(self, tab):
        if not tab:
            return

        self.closed_tabs[tab] = self.opened_editors[tab]
        self.hide(self.opened_editors[tab][2])

        self.opened_editors.pop(tab)
        self.refresh_active_file()
        self.update_tabs()

        self.base.trace(f"Active tab was closed.\nClosed Tabs: {self.closed_tabs}")
        
    def get_active_tab(self):
        return self.opened_editors[self.base.active_file][2]

    def get_active_text(self):
        return self.opened_editors[self.base.active_file][2].text.get_all_text()