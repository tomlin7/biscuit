from lib.text import Text

class Editor(Text):
    def __init__(self, base, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.configure(font=base.settings.font)