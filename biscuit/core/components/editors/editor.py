from ..utils import Frame, IconButton


class BaseEditor(Frame):
    """
    Base class for editors.
    """
    def __init__(self, master, path=None, path2=None, editable=True, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.editors)

        self.path = path
        self.path2 = path2
        self.editable = editable

        self.showpath = False
        self.content = None
        self.diff = False

        self.__buttons__ = ()

    def create_buttons(self, panelbar):
        self.__buttons__ = [IconButton(panelbar, *button) for button in self.__buttons__]

    def save(self, *_):
        ...
