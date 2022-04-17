import tkinter.filedialog as filedialog
from tkinter.filedialog import SaveAs

class Events:
    def __init__(self, master):
        self.base = master
        self.count = 1

    def newfile(self, event=None):
        self.base.set_active_file(file=f"Untitled-{self.count}", exists=False)
        self.count += 1

    def newwindow(self, event=None):
        self.base.open_new_window()

    def openfile(self, event=None):
        self.base.set_active_file(filedialog.askopenfilename())

    def opendir(self, event=None):
        self.base.set_active_dir(filedialog.askdirectory())
        
    def save(self, event=None):
        with open(self.base.active_file, 'w') as f:
            f.write(self.base.root.primarypane.basepane.right.top.editortabs.tabs.get_active_text())

    def saveas(self, event=None):
        a = SaveAs(self.base.root)
        print(a.show())

    def closefile(self, event=None):
        self.base.close_active_file()

    def quit(self, event=None):
        self.base.root.destroy()
    
    def undo(self, event=None):
        self.base.trace('undo event')
        pass
    
    def redo(self, event=None):
        self.base.trace('redo event')
        pass
