from src.biscuit.common import *
from src.biscuit.common.ui import *

from .endpoint import Endpoint


class Utils(Endpoint):
    """Utils endpoint

    Provides various widgets/functions used across the editor.
    """

    def __init__(self, *a) -> None:
        super().__init__(*a)

        self.Bubble = Bubble
        self.Button = Button
        self.ButtonsEntry = ButtonsEntry
        self.caller_name = caller_name
        self.Canvas = Canvas
        self.get_codicon = get_codicon
        self.Entry = Entry
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
