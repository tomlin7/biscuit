import tkinter.filedialog as filedialog
from tkinter.filedialog import asksaveasfile


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
            f.write(self.base.root.primarypane.basepane.right.top.editor_groups.groups.get_active_text())

    def save_as(self, *_):
        with asksaveasfile(
            title="Save As...", defaultextension=".txt",
            initialfile=(self.base.active_file if self.base.active_file else "Untitled")
        ) as fp:
            fp.write(self.base.root.primarypane.basepane.right.top.editor_groups.groups.get_active_text())
            self.base.set_active_file(fp.name)
            print(f"Saved as {fp.name}")

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
