import os

from ..placeholders.welcome import WelcomePage
from ..utils import FileType
# from .diff_viewer import DiffViewer
from .editor import Editor
from .image_viewer import ImageViewer


class EditorsManager:
    def __init__(self, master):
        self.master = master
        self.base = master.base
    
    @staticmethod
    def get_editor(name, path, exists, diff):
        if os.path.isfile(path) and FileType.is_image(path):
            return ImageViewer(name, path) 
        if path == "@welcomepage":
            return WelcomePage(name, path) 
        return Editor(name, path, exists, diff)
