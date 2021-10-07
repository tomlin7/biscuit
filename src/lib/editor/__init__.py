from lib.text import Text
from lib.editor.utils.binder import Binder

class Editor(Text):
    def __init__(self, base, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.base = base

        self.configure(font=self.base.settings.font)
        self.binder = Binder(self.base)