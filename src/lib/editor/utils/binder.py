from lib.config.bindings import Bindings


class Binder:
    def __init__(self, base):
        self.base = base
        self.bindings = self.base.settings.bindings
        # self.editor = self.base.editor
        self.bind()
    
    def bind(self):
        # self.editor.bind()
        pass