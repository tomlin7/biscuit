from lib.config.bindings import Bindings


class Binder:
    def __init__(self, bindings, editor):
        self.bindings = bindings
        self.editor = editor
        self.bind()
    
    def bind(self):
        # self.editor.bind()
        pass