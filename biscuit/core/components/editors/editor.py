import tkinterDnD as dnd

from ..utils import Frame, IconButton


class BaseEditor(Frame):
    """Base class for editors."""
    def __init__(self, master, path=None, path2=None, editable=True, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.editors)

        self.path = path
        self.path2 = path2
        self.editable = editable

        self.showpath = False
        self.content = None
        self.diff = False
        self.run_command_value = ""
        self.language = ""

        self.__buttons__ = []

        self.register_drop_target(dnd.FILE)
        self.bind("<<Drop>>", self.ondrop)
    
    def ondrop(self, event):
        if not event.data:
            return
        
        self.base.open_editor(event.data)

    def add_button(self, *args):
        self.__buttons__.append(args)

    def create_buttons(self, editorsbar):
        try:
            self.__buttons__ = [IconButton(editorsbar, *button) for button in self.__buttons__]
        except:
            pass
        
    def save(self, *_):
        ...
