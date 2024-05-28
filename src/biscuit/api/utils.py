from src.biscuit.utils import *

from .endpoint import Endpoint


class Utils(Endpoint):
    def __init__(self, *a) -> None:
        super().__init__(*a)

        self.Bubble = Bubble
        self.Button = Button
        self.ButtonsEntry = ButtonsEntry
        self.caller_name = caller_name
        self.Canvas = Canvas
        self.get_codicon = get_codicon
        self.colorize = colorize
        self.Entry = Entry
        self.FileType = FileType
        self.FixedSizeStack = FixedSizeStack
        self.Frame = Frame
        self.Icon = Icon
        self.IconButton = IconButton
        self.IconLabelButton = IconLabelButton
        self.Label = Label, TruncatedLabel, WrappingLabel
        self.Menubutton = Menubutton
        self.ScrollableFrame = ScrollableFrame
        self.Scrollbar = Scrollbar
        self.Shortcut = Shortcut
        self.Text = Text
        self.Toplevel = Toplevel
        self.Tree = Tree
