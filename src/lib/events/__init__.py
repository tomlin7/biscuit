import tkinter.filedialog as filedialog
from tkinter.filedialog import SaveAs

class Events:
    def __init__(self, master):
        self.base = master
        self.count = 1

    def new_file(self, *_):
        self.base.set_active_file(file=f"Untitled-{self.count}", exists=False)
        self.count += 1

    def new_window(self, *_):
        self.base.open_new_window()

    def open_file(self, *_):
        self.base.set_active_file(filedialog.askopenfilename())

    def open_dir(self, *_):
        self.base.set_active_dir(filedialog.askdirectory())
        
    def save(self, *_):
        with open(self.base.active_file, 'w') as f:
            f.write(self.base.root.primarypane.basepane.right.top.editortabs.tabs.get_active_text())

    def save_as(self, *_):
        a = SaveAs(self.base.root)
        print(a.show())

    def close_file(self, *_):
        self.base.close_active_file()
    
    def close_dir(self, *_):
        self.base.trace('close dir event')

    def quit(self, *_):
        self.base.root.destroy()
    
    def undo(self, *_):
        self.base.trace('undo event')
    
    def redo(self, *_):
        self.base.trace('redo event')
    
    def cut(self, *_):
        self.base.get_active_tab().cut()

    def copy(self, *_):
        self.base.get_active_tab().copy()

    def paste(self, *_):
        self.base.get_active_tab().paste()
    
    def show_find_widget(self, *_):
        self.base.editor_groups_ref.groups.show_find_widget()
    
    def show_replace_widget(self, *_):
        self.base.editor_groups_ref.groups.show_find_widget(replace=True)