from lib.components.text import Text
from lib.components.editor.utils.binder import Binder

class Editor(Text):
    def __init__(self, master, path, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.path = path
        self.load_file(path=self.path)

        self.configure(font=self.base.settings.font)
        # self.binder = Binder(bindings=self.base.settings.bindings, editor=self)
