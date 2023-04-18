import os
import tkinter as tk
from tkinter.constants import *

from ..utils import FileType
from .breadcrumbs import BreadCrumbs
from .diffeditor import DiffViewer
from .imageviewer import ImageViewer
from .texteditor import TextEditor


def get_editor(path):
    "picks the right editor for the given path"
    if os.path.isfile(path):
        if FileType.is_image(path):
            return ImageViewer
        
    return TextEditor


class Editor(tk.Frame):
    """
    Editor class

    This class is the base class for all editors. It is responsible for
    picking the right editor based on the path & exists values passed.

    path - the path to the file to be opened
    exists - whether the file exists or not
    showpath - whether to show the breadcrumbs or not
    """
    def __init__(self, master, path=None, exists=True, showpath=True, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.path = path
        self.exists = exists
        self.showpath = showpath
        self.filename = os.path.basename(self.path) if path else None

        self.grid_columnconfigure(0, weight=1)

        self.breadcrumbs = BreadCrumbs(self, path)
        self.content = get_editor(path=path)(self, path, exists)

        if self.showpath:
            self.grid_rowconfigure(1, weight=1)  
            self.breadcrumbs.grid(row=0, column=0, sticky=EW, pady=(0, 1))
            self.content.grid(row=1, column=0, sticky=NSEW)
        else:
            self.grid_rowconfigure(0, weight=1)
            self.content.grid(row=0, column=0, sticky=NSEW)
    
    def configure_breadcrumbs(self, flag):
        if flag:
            self.breadcrumbs.grid()
        else:
            self.breadcrumbs.grid_remove()
    
    def focus(self):
        self.content.focus()
