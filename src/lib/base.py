import tkinter as tk

from lib.settings import Settings
from lib.utils.binder import Binder

class Base:
    def __init__(self, root, *args, **kwargs):
        self.root = root
        self.settings = Settings()

        self.binder = Binder(bindings=self.settings.bindings, base=self)

    def trace(self, e):
        print(f'{e} event')
    
    def newfile(self, event):
        self.trace('newfile')
        pass

    def newwindow(self, event):
        self.trace('newwindow')
        pass

    def openfile(self, event):
        self.trace('open')
        pass

    def opendir(self, event):
        self.trace('opendir')
        pass

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
