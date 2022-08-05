import os, tkinter as tk
from tkinter.constants import *

from ..utils import FileType

from .texteditor import TextEditor
from .diffeditor import DiffViewer
from .imageviewer import ImageViewer

from .breadcrumbs import BreadCrumbs

def get_editor(path, exists):
    "Get editor for file type."
    if os.path.isfile(path):
        if FileType.is_image(path):
            return ImageViewer
        
    return TextEditor
    
class Editor(tk.Frame):
    """
    Base editor class.
    """
    def __init__(self, master, path=None, exists=True, showpath=True, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.path = path
        self.exists = exists

        self.breadcrumbs = BreadCrumbs(self, path)
        self.content = get_editor(path=path)(self, path, exists)

        self.breadcrumbs.pack(side=TOP, expand=True, fill=X, pady=(0, 1))
        self.content.pack(side=TOP, expand=True, fill=BOTH)
    
    def configure_breadcrumbs(self, flag):
        if flag:
            self.breadcrumbs.grid()
        else:
            self.breadcrumbs.grid_remove()
    
    def focus(self):
        if self.content.editable:
            self.content.text.focus_set()
