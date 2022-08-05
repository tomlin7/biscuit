from ..texteditor import TextEditor


class DiffPane(TextEditor):
    def load_file(self):
        self.text.load_file()
    
    def load_text(self, text):
        self.text.clear_insert(text)
