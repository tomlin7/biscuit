from biscuit.core.components.utils import Frame


class BaseEditor(Frame):
    """
    Base class for editors.
    """
    def __init__(self, master, path=None, exists=None, editable=True, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.editors)

        self.path = path
        self.exists = exists
        self.editable = editable

        # TODO temp fix for settings, misc editor types
        self.showpath = False
        self.content = None
        self.diff = False

        self.__buttons__ = ()

    def save(self, *_):
        ...
