import tkinter as tk

from .editorsbar import Editorsbar
from .empty import Empty

from core.components.editors import Editor
from core.components.utils import Frame


class EditorsPane(Frame):
    """
    Tabbed container for editors.

    +---------------------------------+
    | File1.txt | File2.py |          |
    +---------------------------------+
    | \    \    \    \    \    \    \ |
    |  \    \    \    \    \    \    \|
    |   \    \    \    \    \    \    |
    |    \    \    \    \    \    \   |
    |\    \    \    \    \    \    \  |
    +---------------------------------+
    """
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.border)

        self.grid_propagate(False)
        self.grid_rowconfigure(1, weight=1)
        self.grid_columnconfigure(0, weight=1)

        self.editorsbar = Editorsbar(self)
        self.editorsbar.grid(row=0, column=0, sticky=tk.EW, pady=(0,1))
        self.tabs = self.editorsbar.tabs

        self.editors = []
        self.closed_editors = {}
        self.empty = True
        self.emptytab = Empty(self)
        self.emptytab.grid(column=0, row=1, sticky=tk.NSEW)

        self.default_editors = [Editor(self, '::welcome::', False, False, False)]
        self.add_editors(self.default_editors)

    def add_editors(self, editors):
        "Append <Editor>s to list. Create tabs for them."
        for editor in editors:
            self.add_editor(editor)
    
    def add_editor(self, editor):
        "Appends a editor to list. Create a tab."
        self.editors.append(editor)
        self.tabs.add_tab(editor)
        
    def delete_all_editors(self):
        "Permanently delete all editors."
        for editor in self.editors:
            editor.destroy()

        self.editorsbar.clear()
        self.tabs.clear_all_tabs()
        self.editors.clear()
    
    def open_editor(self, path, exists):
        "open Editor with path and exists values passed"
        if path in self.closed_editors:
            return self.add_editor(self.closed_editors[path])
        self.add_editor(Editor(self, path, exists))
    
    def open_diff_editor(self, path, exists):
        "open Editor with path and exists values passed"
        self.add_editor(Editor(self, path, exists, diff=True))
    
    def close_editor(self, editor):
        "removes an editor, keeping it in cache."
        self.editors.remove(editor)

        # not keeping diff in cache
        if not editor.diff and editor.content:
            self.closed_editors[editor.path] = editor
        self.refresh()
    
    def close_active_editor(self):
        "Closes the active tab"
        self.close_editor(self.active_editor)

    def delete_editor(self, editor):
        "Permanently delete a editor."
        self.editors.remove(editor)
        if editor.path in self.closed_editors:
            self.closed_editors.remove(editor)

        editor.destroy()
        self.refresh()

    def delete_editor(self, editor):
        "Permanently delete a editor."
        self.editors.remove(editor)
        editor.destroy()
        self.refresh()
    
    def set_active_editor(self, editor):
        "set an existing editor to currently shown one"
        for tab in self.tabs.tabs:
            if tab.editor == editor:
                self.tabs.set_active_tab(tab)

    @property
    def active_editor(self):
        "Get active editor."
        return self.tabs.active_tab.editor
    
    def refresh(self):
        if not len(self.editors) and self.empty:
            self.emptytab.grid()
        elif len(self.editors) and not self.empty:
            self.emptytab.grid_remove()
        self.empty = not self.empty
