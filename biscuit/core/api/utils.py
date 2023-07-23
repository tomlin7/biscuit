from .endpoint import Endpoint

from biscuit.core.components.utils import *

class Utils(Endpoint):
    def __init__(self, *a):
        super().__init__(*a)

        self.Button = Button
        self.ButtonsEntry = ButtonsEntry
        self.colorize = colorize
        self.Entry = Entry
        self.FileType = FileType
        self.get_codicon = get_codicon
        self.Icon = Icon
        self.IconButton = IconButton
        self.IconLabelButton = IconLabelButton
        self.Scrollbar = Scrollbar
        self.ScrollableFrame = ScrollableFrame
        self.Shortcut = Shortcut
        self.Tree = Tree
        self.WrappingLabel = WrappingLabel
