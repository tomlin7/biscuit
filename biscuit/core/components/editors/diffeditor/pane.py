from ..texteditor import TextEditor


class DiffPane(TextEditor):
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, minimalist=True, *args, **kwargs)
