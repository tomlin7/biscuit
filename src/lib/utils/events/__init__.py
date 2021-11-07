import tkinter.filedialog as filedialog

class Events:
    def __init__(self, master):
        self.base = master
        self.count = 1

    def newfile(self, event):
        self.base.set_active_file(file=f"Untitled-{self.count}", exists=False)
        self.count += 1
        self.base.trace(f"<NewFileEvent>(Untitled)")

    def newwindow(self, event):
        self.base.open_new_window()
        self.base.trace(f"<NewWindowEvent>(.)")

    def openfile(self, event):
        self.base.set_active_file(filedialog.askopenfilename())
        self.base.trace(f"<FileOpenEvent>({self.base.active_file})")

    def opendir(self, event):
        self.base.set_active_dir(filedialog.askdirectory())
        self.base.trace(f"<DirOpenEvent>({self.base.active_dir})")
        
    def save(self, event):
        with open(self.base.active_file, 'w') as f:
            f.write(self.base.root.basepane.right.top.editortabs.get_active_text())

        self.base.trace(f"<FileSaveEvent>({self.base.active_file})")

    def saveas(self, event):
        self.base.trace('saveas event')
        pass

    def closefile(self, event):
        self.base.close_active_file()
        self.base.trace(f"<FileCloseEvent>({self.base.active_file})")

    def quit(self, event):
        self.base.root.destroy()
        self.base.trace(f"<ApplicationQuitEvent>")
    
    def undo(self, event):
        self.base.trace('undo event')
        pass
    
    def redo(self, event):
        self.base.trace('redo event')
        pass
