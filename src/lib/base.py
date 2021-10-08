import tkinter as tk
import tkinter.filedialog as filedialog

from lib.settings import Settings
from lib.utils.binder import Binder

class Base:
    def __init__(self, root, *args, **kwargs):
        self.root = root
        self.settings = Settings()

        self.active_dir = None
        self.active_file = None

        self.binder = Binder(bindings=self.settings.bindings, base=self)

    def trace(self, e):
        print(f'{e} event')

    def set_active_file(self, file):
        self.active_file = file
        self.trace(self.active_file)

    def set_active_dir(self, dir):
        self.active_dir = dir
        self.trace(self.active_dir)

    # ----- interface -----

    def newfile(self, event):
        self.trace('newfile')
        pass

    def newwindow(self, event):
        self.trace('newwindow')
        pass

    def openfile(self, event):
        self.trace('open')
        
        self.active_file = filedialog.askopenfilename()
        print(f"Opened file: {self.active_file}")

    def opendir(self, event):
        self.trace('opendir')
        
        self.active_dir = filedialog.askdirectory()
        print(f"Opened directory: {self.active_dir}")
        self.root.basepane.top.left.dirtree.create_root(self.active_dir)

    def save(self, event):
        self.trace('save')
        pass

    def saveas(self, event):
        self.trace('saveas')
        pass

    def closefile(self, event):
        self.trace('closefile')
        pass

    def exit(self, event):
        self.trace('exit')
        # self.root.destroy()
        pass
    
    def undo(self, event):
        self.trace('undo')
        pass
    
    def redo(self, event):
        self.trace('redo')
        pass
