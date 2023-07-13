import os
import tkinter.filedialog as filedialog
from tkinter.filedialog import asksaveasfilename


class Events:
    def __init__(self, base):
        self.base = base
        self.count = 1
        self.maximized = False
        self.minimized = False

    def new_file(self, *_):
        self.base.open_editor(f"Untitled-{self.count}", exists=False)
        self.count += 1

    def new_window(self, *_):
        self.base.open_new_window()

    def open_file(self, *_):
        self.base.open_editor(filedialog.askopenfilename())

    def open_directory(self, *_):
        self.base.open_directory(filedialog.askdirectory())

    def save(self, *_):
        if editor := self.base.editorsmanager.active_editor:
            if editor.content:
                if not editor.content.exists:
                    return self.save_as()
                if editor.content.editable:
                    editor.save()

    def save_as(self, *_):
        #TODO set initial filename to a range of text inside the editor
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                if path := asksaveasfilename(title="Save As...", defaultextension=".txt", initialfile=("Untitled")):
                    editor.save(path)

    def save_all(self, *_):
        for editor in self.base.editorsmanager.editors:
            if editor.content:
                if not editor.content.exists:
                    if path := asksaveasfilename(title="Save As...", defaultextension=".txt", initialfile=("Untitled")):
                        return editor.save(path)
                if editor.content.editable:
                    editor.save()

    def close_file(self, *_):
        self.base.close_active_editor()
    
    def close_dir(self, *_):
        self.base.close_active_directory()

    def quit(self, *_):
        self.base.destroy()
    
    def toggle_maximize(self, *_):
        self.base.wm_state('normal' if self.maximized else 'zoomed')
        self.maximized = not self.maximized
    
    def minimize(self, *_):
        self.base.update_idletasks()
        self.base.overrideredirect(False)
        self.base.state('iconic')
        self.minimized = True
    
    def window_mapped(self, *_):
        if self.minimized:
            self.base.update_idletasks()
            self.base.overrideredirect(True)
            self.base.state('normal')

    #TODO implement undo-redo
    def undo(self, *_):
        print('undo event')
    
    def redo(self, *_):
        print('redo event')
    
    def cut(self, *_):
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.cut()

    def copy(self, *_):
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.copy()

    def paste(self, *_):
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.paste()
