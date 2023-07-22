import os
from tkinter.constants import *

from core.components.games import Whoops
from core.settings.editor import SettingsEditor

from ..utils import FileType, Frame
from .breadcrumbs import BreadCrumbs
from .diffeditor import DiffEditor
from .editor import BaseEditor
from .imageviewer import ImageViewer
from .misc import Welcome
from .texteditor import TextEditor

editors = {f"::{i.name}":i for i in (Welcome, SettingsEditor)}

def get_editors(base):
    "helper function to generate actionset items"
    return [(f"Open {i}", lambda i=i: base.open_game(i)) for i in editors.keys()]

def register_editor(editor):
    "registers a custome editor"
    global editors
    try:
        editors[editor.name] = editor
    except AttributeError:
        editors[f"Editor {len(editors) + 1}"] = editor

def get_editor(path, diff):
    "picks the right editor for the given path"
    if diff:
        return DiffEditor
    
    if os.path.isfile(path):
        if FileType.is_image(path):
            return ImageViewer
    
    if path in editors.keys():
        return editors.get(path, Whoops)
      
    return TextEditor


class Editor(Frame):
    """
    Editor class

    This class is the base class for all editors. It is responsible for
    picking the right editor based on the path & exists values passed.

    path - the path to the file to be opened
    exists - whether the file exists or not
    diff - whether this is a git diff
    showpath - whether to show the breadcrumbs or not
    """
    def __init__(self, master, path=None, exists=True, diff=False, showpath=True, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.border)
        self.path = path
        self.exists = exists
        self.diff = diff
        self.showpath = showpath
        self.filename = os.path.basename(self.path) if path else None

        self.grid_columnconfigure(0, weight=1)
        self.content = get_editor(path=path, diff=diff)(self, path, exists)

        if self.showpath and not diff:
            self.breadcrumbs = BreadCrumbs(self, path)
            self.grid_rowconfigure(1, weight=1)  
            self.breadcrumbs.grid(row=0, column=0, sticky=EW, pady=(0, 1))
            self.content.grid(row=1, column=0, sticky=NSEW)
        else:
            self.grid_rowconfigure(0, weight=1)
            self.content.grid(row=0, column=0, sticky=NSEW)
    
    def save(self, path=None):
        self.content.save(path)
    
    def focus(self):
        self.content.focus()
