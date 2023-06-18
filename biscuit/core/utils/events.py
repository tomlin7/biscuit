import tkinter.filedialog as filedialog
from tkinter.filedialog import asksaveasfilename


class Events:
    def __init__(self, base):
        self.base = base
        self.count = 1

    def new_file(self, *_):
        self.base.open_editor(f"Untitled-{self.count}", exists=False)
        self.count += 1

    def new_window(self, *_):
        self.base.open_new_window()

    def open_file(self, *_):
        self.base.open_editor(filedialog.askopenfilename())

    def open_dir(self, *_):
        self.base.open_directory(filedialog.askdirectory())
        
    def save(self, *_):
        editor = self.base.editorsmanager.get_active_editor()
        if editor.content:
            if not editor.content.exists:
                return self.save_as()
            if editor.content.editable:
                editor.save()

    def save_as(self, *_):
        #TODO set initial filename to a range of text inside the editor
        if editor := self.base.editorsmanager.get_active_editor():
            if editor.content:
                if editor.content.editable:
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
        self.base.close_active_file()
    
    def close_dir(self, *_):
        self.base.close_active_dir()

    def quit(self, *_):
        self.base.destroy()
    
    #TODO implement undo redo
    def undo(self, *_):
        print('undo event')
    
    def redo(self, *_):
        print('redo event')
    
    def cut(self, *_):
        self.base.get_active_tab().cut()

    def copy(self, *_):
        self.base.get_active_tab().copy()

    def paste(self, *_):
        self.base.get_active_tab().paste()
